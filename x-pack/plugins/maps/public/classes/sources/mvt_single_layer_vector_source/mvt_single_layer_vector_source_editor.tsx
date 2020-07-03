/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import React, { Component, ChangeEvent } from 'react';
import _ from 'lodash';
import { EuiFieldText, EuiFormRow, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MAX_ZOOM, MIN_ZOOM } from '../../../../common/constants';
import {
  MVTFieldDescriptor,
  TiledSingleLayerVectorSourceSettings,
} from '../../../../common/descriptor_types';
import { MVTSingleLayerSourceSettings } from './mvt_single_layer_source_settings';

interface Props {
  onSourceConfigChange: (sourceConfig: TiledSingleLayerVectorSourceSettings) => void;
}

interface State {
  urlTemplate: string;
  layerName: string;
  minSourceZoom: number;
  maxSourceZoom: number;
  fields?: MVTFieldDescriptor[];
}

export class MVTSingleLayerVectorSourceEditor extends Component<Props, State> {
  state = {
    urlTemplate: '',
    layerName: '',
    minSourceZoom: MIN_ZOOM,
    maxSourceZoom: MAX_ZOOM,
    fields: [],
  };

  _sourceConfigChange = _.debounce(() => {
    const canPreview =
      this.state.urlTemplate.indexOf('{x}') >= 0 &&
      this.state.urlTemplate.indexOf('{y}') >= 0 &&
      this.state.urlTemplate.indexOf('{z}') >= 0;

    if (canPreview && this.state.layerName) {
      this.props.onSourceConfigChange({
        urlTemplate: this.state.urlTemplate,
        layerName: this.state.layerName,
        minSourceZoom: this.state.minSourceZoom,
        maxSourceZoom: this.state.maxSourceZoom,
        fields: this.state.fields,
      });
    }
  }, 200);

  _handleUrlTemplateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    this.setState(
      {
        urlTemplate: url,
      },
      () => this._sourceConfigChange()
    );
  };

  _handleChange = (state: {
    layerName: string;
    fields: MVTFieldDescriptor[];
    minSourceZoom: number;
    maxSourceZoom: number;
  }) => {
    this.setState(state, () => this._sourceConfigChange());
  };

  render() {
    return (
      <EuiPanel>
        <EuiFormRow
          label={i18n.translate('xpack.maps.source.MVTSingleLayerVectorSourceEditor.urlMessage', {
            defaultMessage: 'Url',
          })}
          helpText={i18n.translate(
            'xpack.maps.source.MVTSingleLayerVectorSourceEditor.urlHelpMessage',
            {
              defaultMessage: 'URL of the .mvt vector tile service. e.g. {url}',
              values: {
                url: 'http://company.com/{z}/{x}/{y}.pbf',
              },
            }
          )}
        >
          <EuiFieldText
            value={this.state.urlTemplate}
            onChange={this._handleUrlTemplateChange}
            compressed
          />
        </EuiFormRow>

        <MVTSingleLayerSourceSettings
          handleChange={this._handleChange}
          layerName={this.state.layerName}
          fields={this.state.fields}
          minSourceZoom={this.state.minSourceZoom}
          maxSourceZoom={this.state.maxSourceZoom}
          showFields={false}
        />
      </EuiPanel>
    );
  }
}
