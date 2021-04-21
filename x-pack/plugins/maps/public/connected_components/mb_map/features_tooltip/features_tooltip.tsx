/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment, ReactNode } from 'react';
import { EuiIcon, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ActionExecutionContext, Action } from 'src/plugins/ui_actions/public';
import { GeoJsonProperties, Geometry } from 'geojson';
import { Filter } from 'src/plugins/data/public';
import { FeatureProperties } from './feature_properties';
import { GEO_JSON_TYPE, ES_GEO_FIELD_TYPE, RawValue } from '../../../../common/constants';
import { FeatureGeometryFilterForm } from './feature_geometry_filter_form';
import { Footer } from './footer';
import { Header } from './header';
import { PreIndexedShape } from '../../../../common/elasticsearch_util';
import { GeoFieldWithIndex } from '../../../components/geo_field_with_index';
import { TooltipFeature } from '../../../../common/descriptor_types';
import { ITooltipProperty } from '../../../classes/tooltips/tooltip_property';
import { ILayer } from '../../../classes/layers/layer';

enum VIEWS {
  PROPERTIES_VIEW = 'PROPERTIES_VIEW',
  GEOMETRY_FILTER_VIEW = 'GEOMETRY_FILTER_VIEW',
  FILTER_ACTIONS_VIEW = 'FILTER_ACTIONS_VIEW',
}

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
    featureId,
    mbProperties,
  }: {
    layerId: string;
    featureId?: string | number;
    mbProperties: GeoJsonProperties;
  }) => Promise<ITooltipProperty[]>;
  loadFeatureGeometry: ({
    layerId,
    featureId,
  }: {
    layerId: string;
    featureId?: string | number;
  }) => Geometry | null;
  getLayerName: (layerId: string) => Promise<string | null>;
  findLayerById: (layerId: string) => ILayer | undefined;
  geoFields: GeoFieldWithIndex[];
  loadPreIndexedShape: ({
    layerId,
    featureId,
  }: {
    layerId: string;
    featureId?: string | number;
  }) => Promise<PreIndexedShape | null>;
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
    view: VIEWS.PROPERTIES_VIEW,
  };

  static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    if (nextProps.features !== prevState.prevFeatures) {
      return {
        currentFeature: nextProps.features ? nextProps.features[0] : null,
        view: VIEWS.PROPERTIES_VIEW,
        prevFeatures: nextProps.features,
      };
    }

    return null;
  }

  _setCurrentFeature = (feature: TooltipFeature) => {
    this.setState({ currentFeature: feature });
  };

  _showGeometryFilterView = () => {
    this.setState({ view: VIEWS.GEOMETRY_FILTER_VIEW });
  };

  _showPropertiesView = () => {
    this.setState({ view: VIEWS.PROPERTIES_VIEW, filterView: null });
  };

  _showFilterActionsView = (filterView: ReactNode) => {
    this.setState({ view: VIEWS.FILTER_ACTIONS_VIEW, filterView });
  };

  _renderActions(geoFields: GeoFieldWithIndex[]) {
    if (!this.props.isLocked || geoFields.length === 0) {
      return null;
    }

    return (
      <EuiLink className="mapFeatureTooltip_actionLinks" onClick={this._showGeometryFilterView}>
        <FormattedMessage
          id="xpack.maps.tooltip.showGeometryFilterViewLinkLabel"
          defaultMessage="Filter by geometry"
        />
      </EuiLink>
    );
  }

  _filterGeoFields(featureGeometry: Geometry | null) {
    if (!featureGeometry) {
      return [];
    }

    // line geometry can only create filters for geo_shape fields.
    if (
      featureGeometry.type === GEO_JSON_TYPE.LINE_STRING ||
      featureGeometry.type === GEO_JSON_TYPE.MULTI_LINE_STRING
    ) {
      return this.props.geoFields.filter(({ geoFieldType }) => {
        return geoFieldType === ES_GEO_FIELD_TYPE.GEO_SHAPE;
      });
    }

    // TODO support geo distance filters for points
    if (
      featureGeometry.type === GEO_JSON_TYPE.POINT ||
      featureGeometry.type === GEO_JSON_TYPE.MULTI_POINT
    ) {
      return [];
    }

    return this.props.geoFields;
  }

  _loadCurrentFeaturePreIndexedShape = async () => {
    if (!this.state.currentFeature) {
      return null;
    }

    return this.props.loadPreIndexedShape({
      layerId: this.state.currentFeature.layerId,
      featureId: this.state.currentFeature.id,
    });
  };

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

    const currentFeatureGeometry = this.props.loadFeatureGeometry({
      layerId: this.state.currentFeature.layerId,
      featureId: this.state.currentFeature.id,
    });
    const geoFields = this._filterGeoFields(currentFeatureGeometry);

    if (
      this.state.view === VIEWS.GEOMETRY_FILTER_VIEW &&
      currentFeatureGeometry &&
      this.props.addFilters
    ) {
      return (
        <Fragment>
          {this._renderBackButton(
            i18n.translate('xpack.maps.tooltip.showGeometryFilterViewLinkLabel', {
              defaultMessage: 'Filter by geometry',
            })
          )}
          <FeatureGeometryFilterForm
            onClose={this.props.closeTooltip}
            geometry={currentFeatureGeometry}
            geoFields={geoFields}
            addFilters={this.props.addFilters}
            getFilterActions={this.props.getFilterActions}
            getActionContext={this.props.getActionContext}
            loadPreIndexedShape={this._loadCurrentFeaturePreIndexedShape}
          />
        </Fragment>
      );
    }

    if (this.state.view === VIEWS.FILTER_ACTIONS_VIEW) {
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
        {this._renderActions(geoFields)}
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
