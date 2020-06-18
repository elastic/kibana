/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiRadioGroup } from '@elastic/eui';
import { IFieldType, IndexPattern } from 'src/plugins/data/public';
import { RenderWizardArguments } from '../../layer_wizard_registry';
import { EMSFileSelect } from '../../../components/ems_file_select';
import { GeoIndexPatternSelect } from '../../../components/geo_index_pattern_select';
import { SingleFieldSelect } from '../../../components/single_field_select';
import { getIndexPatternSelectComponent } from '../../../kibana_services';
import { getGeoFields, getSourceFields } from '../../../index_pattern_util';

export enum BOUNDARIES_SOURCE {
  ELASTICSEARCH = 'ELASTICSEARCH',
  EMS = 'EMS',
}

const BOUNDARIES_OPTIONS = [
  {
    id: BOUNDARIES_SOURCE.ELASTICSEARCH,
    label: i18n.translate('xpack.maps.choropleth.boundaries.elasticsearch', {
      defaultMessage: 'Points, lines, and polygons from Elasticsearch',
    }),
  },
  {
    id: BOUNDARIES_SOURCE.EMS,
    label: i18n.translate('xpack.maps.choropleth.boundaries.ems', {
      defaultMessage: 'Administrative boundaries from Elastic Maps Service',
    }),
  },
];

const IndexPatternSelect = getIndexPatternSelectComponent();

interface State {
  leftSource: BOUNDARIES_SOURCE;
  leftEmsFileId: string | null;
  leftIndexPattern: IndexPattern | null;
  leftGeoFields: IFieldType[];
  leftJoinFields: IFieldType[];
  leftGeoField: string | null;
  leftJoinField: string | null;
  rightIndexPatternId: string | null;
  rightJoinField: string | null;
}

export class LayerTemplate extends Component<RenderWizardArguments, State> {
  state = {
    leftSource: BOUNDARIES_SOURCE.ELASTICSEARCH,
    leftEmsFileId: null,
    leftIndexPattern: null,
    leftGeoFields: [],
    leftJoinFields: [],
    leftGeoField: null,
    leftJoinField: null,
    rightIndexPatternId: null,
    rightJoinField: null,
  };

  _onLeftSourceChange = (optionId: string) => {
    this.setState({ leftSource: optionId }, this._previewLayer);
  };

  _onLeftIndexPatternChange = (indexPattern: IndexPattern) => {
    this.setState(
      {
        leftIndexPattern: indexPattern,
        leftGeoFields: getGeoFields(indexPattern.fields),
        leftJoinFields: getSourceFields(indexPattern.fields),
        leftGeoField: null,
        leftJoinField: null,
      },
      () => {
        // make default geo field selection
        if (this.state.leftGeoFields.length) {
          this._onLeftGeoFieldSelect(this.state.leftGeoFields[0].name);
        }
      }
    );
  };

  _onLeftGeoFieldSelect = (geoField: string) => {
    this.setState({ leftGeoField: geoField }, this._previewLayer);
  };

  _onLeftJoinFieldSelect = (joinField: string) => {
    this.setState({ leftJoinField: joinField }, this._previewLayer);
  };

  _onEmsFileChange = (emFileId: string) => {
    this.setState({ leftEmsFileId: emFileId }, this._previewLayer);
  };

  _isLeftConfigComplete() {
    if (this.state.leftSource === BOUNDARIES_SOURCE.ELASTICSEARCH) {
      return (
        !!this.state.leftIndexPattern && !!this.state.leftGeoField && !!this.state.leftJoinField
      );
    } else {
      return !!this.state.leftEmsFileId && !!this.state.leftJoinField;
    }
  }

  _isRightConfigComplete() {
    return !!this.state.rightIndexPatternId && !!this.state.rightJoinField;
  }

  _previewLayer() {
    if (!this._isLeftConfigComplete() || !this._isRightConfigComplete()) {
      return;
    }

    /* const layerDescriptor = createLayerDescriptor({
      layer: this.state.layer,
      metric: this.state.metric,
      display: this.state.display,
    });
    this.props.previewLayers(layerDescriptor ? [layerDescriptor] : []);*/
  }

  _renderLeftSource() {
    if (this.state.leftSource === BOUNDARIES_SOURCE.ELASTICSEARCH) {
      let geoFieldSelect;
      if (this.state.leftGeoFields.length) {
        geoFieldSelect = (
          <EuiFormRow
            label={i18n.translate('xpack.maps.choropleth.geofieldLabel', {
              defaultMessage: 'Geospatial field',
            })}
          >
            <SingleFieldSelect
              placeholder={i18n.translate('xpack.maps.choropleth.geofieldPlaceholder', {
                defaultMessage: 'Select geo field',
              })}
              value={this.state.leftGeoField}
              onChange={this._onLeftGeoFieldSelect}
              fields={this.state.leftGeoFields}
              isClearable={false}
            />
          </EuiFormRow>
        );
      }
      let joinFieldSelect;
      if (this.state.leftJoinFields.length) {
        joinFieldSelect = (
          <EuiFormRow
            label={i18n.translate('xpack.maps.choropleth.joinFieldLabel', {
              defaultMessage: 'Boundaries join field',
            })}
          >
            <SingleFieldSelect
              placeholder={i18n.translate('xpack.maps.choropleth.joinFieldPlaceholder', {
                defaultMessage: 'Select field',
              })}
              value={this.state.leftJoinField}
              onChange={this._onLeftJoinFieldSelect}
              fields={this.state.leftJoinFields}
              isClearable={false}
            />
          </EuiFormRow>
        );
      }
      return (
        <>
          <GeoIndexPatternSelect
            value={this.state.leftIndexPattern ? this.state.leftIndexPattern.id : ''}
            onChange={this._onLeftIndexPatternChange}
          />
          {geoFieldSelect}
          {joinFieldSelect}
        </>
      );
    } else {
      return <EMSFileSelect value={this.state.leftEmsFileId} onChange={this._onEmsFileChange} />;
    }
  }

  render() {
    return (
      <>
        <EuiFormRow
          label={i18n.translate('xpack.maps.choropleth.boundariesLabel', {
            defaultMessage: 'Boundaries source',
          })}
        >
          <EuiRadioGroup
            options={BOUNDARIES_OPTIONS}
            idSelected={this.state.leftSource}
            onChange={this._onLeftSourceChange}
          />
        </EuiFormRow>

        {this._renderLeftSource()}
      </>
    );
  }
}
