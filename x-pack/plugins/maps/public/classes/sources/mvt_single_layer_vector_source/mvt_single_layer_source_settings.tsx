/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import React, { Fragment, Component, ChangeEvent } from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import { MAX_ZOOM, MIN_ZOOM } from '../../../../common/constants';
import { ValidatedDualRange, Value } from '../../../../../../../src/plugins/kibana_react/public';
import { MVTFieldConfigEditor } from './mvt_field_config_editor';
import { MVTFieldDescriptor } from '../../../../common/descriptor_types';

export type MVTSettings = {
  layerName: string;
  fields: MVTFieldDescriptor[];
  minSourceZoom: number;
  maxSourceZoom: number;
};

export interface State {
  currentSettings: MVTSettings;
  prevSettings: MVTSettings;
}

export interface Props {
  handleChange: (args: MVTSettings) => void;
  layerName: string;
  fields: MVTFieldDescriptor[];
  minSourceZoom: number;
  maxSourceZoom: number;
  includeFields: boolean;
}

export class MVTSingleLayerSourceSettings extends Component<Props, State> {
  static getDerivedStateFromProps(nextProps, prevState) {
    const newSettings = {
      layerName: nextProps.layerName,
      fields: nextProps.fields,
      minSourceZoom: nextProps.minSourceZoom,
      maxSourceZoom: nextProps.maxSourceZoom,
    };

    if (_.isEqual(newSettings, prevState.prevSettings)) {
      return null;
    }

    return {
      prevSettings: newSettings,
      currentSettings: newSettings,
    };
  }

  _handleChange = _.debounce(() => {
    this.props.handleChange(this.state.currentSettings);
  }, 200);

  _handleLayerNameInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const currentSettings = {
      layerName: e.target.value,
      minSourceZoom: this.state.currentSettings.minSourceZoom,
      maxSourceZoom: this.state.currentSettings.maxSourceZoom,
      fields: this.state.currentSettings.fields,
    };

    this.setState({ currentSettings }, this._handleChange);
  };

  _handleFieldChange = (fields: MVTFieldDescriptor[]) => {
    const currentSettings = {
      layerName: this.state.currentSettings.layerName,
      minSourceZoom: this.state.currentSettings.minSourceZoom,
      maxSourceZoom: this.state.currentSettings.maxSourceZoom,
      fields,
    };
    this.setState({ currentSettings }, this._handleChange);
  };

  _handleZoomRangeChange = (e: Value) => {
    const currentSettings = {
      layerName: this.state.currentSettings.layerName,
      fields: this.state.currentSettings.fields,
      minSourceZoom: parseInt(e[0] as string, 10),
      maxSourceZoom: parseInt(e[1] as string, 10),
    };
    this.setState({ currentSettings }, this._handleChange);
  };

  render() {
    const fieldEditor = this.props.includeFields ? (
      <EuiFormRow
        label={i18n.translate('xpack.maps.source.MVTSingleLayerVectorSourceEditor.fieldsMessage', {
          defaultMessage: 'Fields',
        })}
      >
        <MVTFieldConfigEditor
          fields={this.state.currentSettings.fields}
          onChange={this._handleFieldChange}
        />
      </EuiFormRow>
    ) : null;

    return (
      <Fragment>
        <EuiFormRow
          label={i18n.translate(
            'xpack.maps.source.MVTSingleLayerVectorSourceEditor.layerNameMessage',
            {
              defaultMessage: 'Layer name',
            }
          )}
        >
          <EuiFieldText
            value={this.state.currentSettings.layerName}
            onChange={this._handleLayerNameInputChange}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate(
            'xpack.maps.source.MVTSingleLayerVectorSourceEditor.zoomRangeTopMessage',
            {
              defaultMessage: 'Available levels',
            }
          )}
        >
          <ValidatedDualRange
            label=""
            formRowDisplay="columnCompressed"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            value={[
              this.state.currentSettings.minSourceZoom,
              this.state.currentSettings.maxSourceZoom,
            ]}
            showInput="inputWithPopover"
            showRange
            showLabels
            onChange={this._handleZoomRangeChange}
            allowEmptyRange={false}
            compressed
            prepend={i18n.translate(
              'xpack.maps.source.MVTSingleLayerVectorSourceEditor.dataZoomRangeMessage',
              {
                defaultMessage: 'Zoom',
              }
            )}
          />
        </EuiFormRow>
        {fieldEditor}
      </Fragment>
    );
  }
}
