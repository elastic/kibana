/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component, ChangeEvent } from 'react';
import _ from 'lodash';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TileJsonVectorSourceSettings } from '../../../../common/descriptor_types';
import { TileJsonSourceSettings } from './tilejson_source_settings';

export interface Props {
  onSourceConfigChange: (sourceConfig: TileJsonVectorSourceSettings) => void;
}

interface State {
  url: string;
  layerName: string;
}

export class TileJsonSourceEditor extends Component<Props, State> {
  state = {
    url: '',
    layerName: '',
  };

  _sourceConfigChange = _.debounce(() => {
    if (this.state.layerName && this.state.url) {
      this.props.onSourceConfigChange({
        url: this.state.url,
        layerName: this.state.layerName,
      });
    }
  }, 200);

  _handleUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;

    if (this.state.url === url) {
      return;
    }

    this.setState(
      {
        url,
      },
      () => this._sourceConfigChange()
    );
  };

  _handleLayerNameChange = (layerName: string) => {
    if (this.state.layerName === layerName) {
      return;
    }
    this.setState({ layerName }, () => this._sourceConfigChange());
  };

  render() {
    return (
      <Fragment>
        <EuiFormRow
          label={i18n.translate('xpack.maps.source.TileJson.urlMessage', {
            defaultMessage: 'Url',
          })}
          helpText={i18n.translate('xpack.maps.source.TileJson.urlHelpMessage', {
            defaultMessage: 'URL of the .mvt vector tile service. e.g. {url}',
            values: {
              url: 'https://tiles.maps.elastic.co/data/v3.json',
            },
          })}
        >
          <EuiFieldText value={this.state.url} onChange={this._handleUrlChange} compressed />
        </EuiFormRow>

        <TileJsonSourceSettings
          handleChange={this._handleLayerNameChange}
          layerName={this.state.layerName}
          url={this.state.url}
        />
      </Fragment>
    );
  }
}
