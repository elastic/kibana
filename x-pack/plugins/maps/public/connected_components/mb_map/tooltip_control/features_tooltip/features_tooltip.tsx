/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment, ReactNode } from 'react';
import { EuiIcon, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionExecutionContext, Action } from 'src/plugins/ui_actions/public';
import { GeoJsonProperties } from 'geojson';
import { Filter } from '@kbn/es-query';
import { FeatureProperties } from './feature_properties';
import { RawValue } from '../../../../../common/constants';
import { Footer } from './footer';
import { Header } from './header';
import { GEOMETRY_FILTER_ACTION, TooltipFeature } from '../../../../../common/descriptor_types';
import { ITooltipProperty } from '../../../../classes/tooltips/tooltip_property';
import { IVectorLayer } from '../../../../classes/layers/vector_layer';

const PROPERTIES_VIEW = 'PROPERTIES_VIEW';
const FILTER_ACTIONS_VIEW = 'FILTER_ACTIONS_VIEW';

type VIEWS = typeof PROPERTIES_VIEW | typeof FILTER_ACTIONS_VIEW | typeof GEOMETRY_FILTER_ACTION;

interface Props {
  addFilters: ((filters: Filter[], actionId: string) => Promise<void>) | null;
  getFilterActions?: () => Promise<Action[]>;
  getActionContext?: () => ActionExecutionContext;
  onSingleValueTrigger?: (actionId: string, key: string, value: RawValue) => void;
  closeTooltip: () => void;
  features: TooltipFeature[];
  isLocked: boolean;
  loadFeatureProperties: ({
    layerId,
    properties,
  }: {
    layerId: string;
    properties: GeoJsonProperties;
  }) => Promise<ITooltipProperty[]>;
  getLayerName: (layerId: string) => Promise<string | null>;
  findLayerById: (layerId: string) => IVectorLayer | undefined;
}

interface State {
  currentFeature: TooltipFeature | null;
  filterView: ReactNode | null;
  prevFeatures: TooltipFeature[];
  view: VIEWS;
}

export class FeaturesTooltip extends Component<Props, State> {
  state: State = {
    currentFeature: null,
    filterView: null,
    prevFeatures: [],
    view: PROPERTIES_VIEW,
  };

  static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    if (nextProps.features !== prevState.prevFeatures) {
      let nextCurrentFeature = nextProps.features ? nextProps.features[0] : null;
      if (prevState.currentFeature) {
        const updatedCurrentFeature = nextProps.features.find((tooltipFeature) => {
          return (
            tooltipFeature.id === prevState.currentFeature!.id &&
            tooltipFeature.layerId === prevState.currentFeature!.layerId
          );
        });
        if (updatedCurrentFeature) {
          nextCurrentFeature = updatedCurrentFeature;
        }
      }
      return {
        currentFeature: nextCurrentFeature,
        view: PROPERTIES_VIEW,
        prevFeatures: nextProps.features,
      };
    }

    return null;
  }

  _setCurrentFeature = (feature: TooltipFeature) => {
    this.setState({ currentFeature: feature });
  };

  _showPropertiesView = () => {
    this.setState({ view: PROPERTIES_VIEW, filterView: null });
  };

  _showFilterActionsView = (filterView: ReactNode) => {
    this.setState({ view: FILTER_ACTIONS_VIEW, filterView });
  };

  _renderActions() {
    if (
      !this.props.isLocked ||
      !this.state.currentFeature ||
      this.state.currentFeature.actions.length === 0
    ) {
      return null;
    }

    return this.state.currentFeature.actions.map((action) => {
      return (
        <EuiLink
          className="mapFeatureTooltip_actionLinks"
          onClick={() => {
            this.setState({ view: action.id });
          }}
          key={action.id}
        >
          {action.label}
        </EuiLink>
      );
    });
  }

  _renderBackButton(label: string) {
    return (
      <button
        className="euiContextMenuPanelTitle mapFeatureTooltip_backButton"
        type="button"
        onClick={this._showPropertiesView}
      >
        <span className="euiContextMenu__itemLayout">
          <EuiIcon type="arrowLeft" size="m" className="euiContextMenu__icon" />

          <span className="euiContextMenu__text">{label}</span>
        </span>
      </button>
    );
  }

  render() {
    if (!this.state.currentFeature) {
      return null;
    }

    const action = this.state.currentFeature.actions.find(({ id }) => {
      return id === this.state.view;
    });

    if (action) {
      return (
        <Fragment>
          {this._renderBackButton(action.label)}
          {action.form}
        </Fragment>
      );
    }

    if (this.state.view === FILTER_ACTIONS_VIEW) {
      return (
        <Fragment>
          {this._renderBackButton(
            i18n.translate('xpack.maps.tooltip.showAddFilterActionsViewLabel', {
              defaultMessage: 'Filter actions',
            })
          )}
          {this.state.filterView}
        </Fragment>
      );
    }

    return (
      <Fragment>
        <Header
          key={this.state.currentFeature.layerId}
          layerId={this.state.currentFeature.layerId}
          findLayerById={this.props.findLayerById}
          isLocked={this.props.isLocked}
          onClose={this.props.closeTooltip}
        />
        <FeatureProperties
          featureId={this.state.currentFeature.id}
          layerId={this.state.currentFeature.layerId}
          mbProperties={this.state.currentFeature.mbProperties}
          loadFeatureProperties={this.props.loadFeatureProperties}
          showFilterButtons={!!this.props.addFilters && this.props.isLocked}
          onCloseTooltip={this.props.closeTooltip}
          addFilters={this.props.addFilters}
          getFilterActions={this.props.getFilterActions}
          getActionContext={this.props.getActionContext}
          onSingleValueTrigger={this.props.onSingleValueTrigger}
          showFilterActions={this._showFilterActionsView}
        />
        {this._renderActions()}
        <Footer
          features={this.props.features}
          isLocked={this.props.isLocked}
          findLayerById={this.props.findLayerById}
          setCurrentFeature={this._setCurrentFeature}
        />
      </Fragment>
    );
  }
}
