/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, RefObject } from 'react';
import { EuiPopover, EuiText } from '@elastic/eui';
import { Map as MbMap } from 'mapbox-gl';
import { GeoJsonProperties, Geometry } from 'geojson';
import { Filter } from 'src/plugins/data/public';
import { ActionExecutionContext, Action } from 'src/plugins/ui_actions/public';
import { FeaturesTooltip } from './features_tooltip';
import { LAT_INDEX, LON_INDEX, RawValue } from '../../../../common/constants';
import { IVectorLayer } from '../../../classes/layers/vector_layer';
import { TooltipFeature } from '../../../../common/descriptor_types';
import { RenderToolTipContent } from '../../../classes/tooltips/tooltip_property';

const noop = () => {};

interface Props {
  addFilters: ((filters: Filter[], actionId: string) => Promise<void>) | null;
  closeTooltip: () => void;
  features: TooltipFeature[];
  findLayerById: (layerId: string) => IVectorLayer | undefined;
  getActionContext?: () => ActionExecutionContext;
  getFilterActions?: () => Promise<Action[]>;
  index: number;
  isLocked: boolean;
  loadFeatureGeometry: ({
    layerId,
    featureId,
  }: {
    layerId: string;
    featureId?: string | number;
  }) => Geometry | null;
  location: [number, number];
  mbMap: MbMap;
  onSingleValueTrigger?: (actionId: string, key: string, value: RawValue) => void;
  renderTooltipContent?: RenderToolTipContent;
}

interface State {
  x?: number;
  y?: number;
  isVisible: boolean;
}

export class TooltipPopover extends Component<Props, State> {
  private readonly _popoverRef: RefObject<EuiPopover> = React.createRef();

  state: State = {
    isVisible: true,
  };

  componentDidMount() {
    this._updatePopoverPosition();
    this.props.mbMap.on('move', this._updatePopoverPosition);
  }

  componentDidUpdate() {
    if (this._popoverRef.current) {
      this._popoverRef.current.positionPopoverFluid();
    }
  }

  componentWillUnmount() {
    this.props.mbMap.off('move', this._updatePopoverPosition);
  }

  _updatePopoverPosition = () => {
    const nextPoint = this.props.mbMap.project(this.props.location);
    const lat = this.props.location[LAT_INDEX];
    const lon = this.props.location[LON_INDEX];
    const bounds = this.props.mbMap.getBounds();
    this.setState({
      x: nextPoint.x,
      y: nextPoint.y,
      isVisible:
        lat < bounds.getNorth() &&
        lat > bounds.getSouth() &&
        lon > bounds.getWest() &&
        lon < bounds.getEast(),
    });
  };

  _loadFeatureProperties = async ({
    layerId,
    featureId,
    mbProperties,
  }: {
    layerId: string;
    featureId?: string | number;
    mbProperties?: GeoJsonProperties;
  }) => {
    const tooltipLayer = this.props.findLayerById(layerId);
    if (!tooltipLayer) {
      return [];
    }

    let targetFeature;
    if (typeof featureId !== 'undefined') {
      targetFeature = tooltipLayer.getFeatureById(featureId);
    }

    const properties = targetFeature ? targetFeature.properties : mbProperties;
    return await tooltipLayer.getPropertiesForTooltip(properties ? properties : {});
  };

  _getLayerName = async (layerId: string) => {
    const layer = this.props.findLayerById(layerId);
    if (!layer) {
      return null;
    }

    return layer.getDisplayName();
  };

  _renderTooltipContent = () => {
    const publicProps = {
      addFilters: this.props.addFilters,
      getFilterActions: this.props.getFilterActions,
      getActionContext: this.props.getActionContext,
      onSingleValueTrigger: this.props.onSingleValueTrigger,
      closeTooltip: this.props.closeTooltip,
      features: this.props.features,
      isLocked: this.props.isLocked,
      loadFeatureProperties: this._loadFeatureProperties,
      loadFeatureGeometry: this.props.loadFeatureGeometry,
      getLayerName: this._getLayerName,
    };

    if (this.props.renderTooltipContent) {
      return this.props.renderTooltipContent(publicProps);
    }

    return (
      <EuiText size="xs" style={{ maxWidth: '425px' }}>
        <FeaturesTooltip {...publicProps} findLayerById={this.props.findLayerById} />
      </EuiText>
    );
  };

  render() {
    if (!this.state.isVisible || this.state.x === undefined || this.state.y === undefined) {
      return null;
    }

    const tooltipAnchor = <div style={{ height: '26px', width: '26px', background: 'none' }} />;
    // Although tooltip anchors are not visible, they take up horizontal space.
    // This horizontal spacing needs to be accounted for in the translate function,
    // otherwise the anchors get increasingly pushed to the right away from the actual location.
    const offset = this.props.index * 26;
    return (
      <EuiPopover
        id="mapTooltip"
        button={tooltipAnchor}
        anchorPosition="upCenter"
        isOpen
        closePopover={noop}
        ref={this._popoverRef}
        style={{
          pointerEvents: 'none',
          transform: `translate(${this.state.x - 13 - offset}px, ${this.state.y - 13}px)`,
        }}
      >
        {this._renderTooltipContent()}
      </EuiPopover>
    );
  }
}
