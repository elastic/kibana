/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import React, { Component, ChangeEvent } from 'react';
import _ from 'lodash';
import { EuiFormRow, EuiFieldText, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type XYZTMSSourceConfig = {
  urlTemplate: string;
  attributionText: string;
  attributionUrl: string;
};

interface Props {
  onSourceConfigChange: (sourceConfig: XYZTMSSourceConfig | null) => void;
}

interface State {
  url: string;
  attributionText: string;
  attributionUrl: string;
}

export class XYZTMSEditor extends Component<Props, State> {
  state = {
    url: '',
    attributionText: '',
    attributionUrl: '',
  };

  _previewLayer = _.debounce(() => {
    const { url, attributionText, attributionUrl } = this.state;

    const isUrlValid =
      url.indexOf('{x}') >= 0 && url.indexOf('{y}') >= 0 && url.indexOf('{z}') >= 0;
    const sourceConfig = isUrlValid
      ? {
          urlTemplate: url,
          attributionText,
          attributionUrl,
        }
      : null;
    this.props.onSourceConfigChange(sourceConfig);
  }, 500);

  _onUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.setState({ url: event.target.value }, this._previewLayer);
  };

  _onAttributionTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.setState({ attributionText: event.target.value }, this._previewLayer);
  };

  _onAttributionUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.setState({ attributionUrl: event.target.value }, this._previewLayer);
  };

  render() {
    const { attributionText, attributionUrl } = this.state;
    return (
      <EuiPanel>
        <EuiFormRow label="Url">
          <EuiFieldText
            placeholder={'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'}
            onChange={this._onUrlChange}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.maps.xyztmssource.attributionTextLabel', {
            defaultMessage: 'Attribution text',
          })}
          isInvalid={attributionUrl !== '' && attributionText === ''}
          error={[
            i18n.translate('xpack.maps.xyztmssource.attributionText', {
              defaultMessage: 'Attribution url must have accompanying text',
            }),
          ]}
        >
          <EuiFieldText value={attributionText} onChange={this._onAttributionTextChange} />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.maps.xyztmssource.attributionLinkLabel', {
            defaultMessage: 'Attribution link',
          })}
          isInvalid={attributionText !== '' && attributionUrl === ''}
          error={[
            i18n.translate('xpack.maps.xyztmssource.attributionLink', {
              defaultMessage: 'Attribution text must have an accompanying link',
            }),
          ]}
        >
          <EuiFieldText value={attributionUrl} onChange={this._onAttributionUrlChange} />
        </EuiFormRow>
      </EuiPanel>
    );
  }
}
