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
import { AttributionDescriptor } from '../../../../common/descriptor_types';

export type XYZTMSSourceConfig = AttributionDescriptor & {
  urlTemplate: string;
};

export interface Props {
  onSourceConfigChange: (sourceConfig: XYZTMSSourceConfig) => void;
}

interface State {
  tmsInput: string;
  tmsCanPreview: boolean;
  attributionText: string;
  attributionUrl: string;
}

export class XYZTMSEditor extends Component<Props, State> {
  state = {
    tmsInput: '',
    tmsCanPreview: false,
    attributionText: '',
    attributionUrl: '',
  };

  _sourceConfigChange = _.debounce((updatedSourceConfig: XYZTMSSourceConfig) => {
    if (this.state.tmsCanPreview) {
      this.props.onSourceConfigChange(updatedSourceConfig);
    }
  }, 2000);

  _handleTMSInputChange(e: ChangeEvent<HTMLInputElement>) {
    const url = e.target.value;

    const canPreview =
      url.indexOf('{x}') >= 0 && url.indexOf('{y}') >= 0 && url.indexOf('{z}') >= 0;
    this.setState(
      {
        tmsInput: url,
        tmsCanPreview: canPreview,
      },
      () => this._sourceConfigChange({ urlTemplate: url })
    );
  }

  _handleTMSAttributionChange(attributionUpdate: AttributionDescriptor) {
    this.setState(
      {
        attributionUrl: attributionUpdate.attributionUrl || '',
        attributionText: attributionUpdate.attributionText || '',
      },
      () => {
        const { attributionText, attributionUrl, tmsInput } = this.state;

        if (tmsInput && attributionText && attributionUrl) {
          this._sourceConfigChange({
            urlTemplate: tmsInput,
            attributionText,
            attributionUrl,
          });
        }
      }
    );
  }

  render() {
    const { attributionText, attributionUrl } = this.state;
    return (
      <EuiPanel>
        <EuiFormRow label="Url">
          <EuiFieldText
            placeholder={'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'}
            onChange={(e) => this._handleTMSInputChange(e)}
          />
        </EuiFormRow>
        <EuiFormRow
          label="Attribution text"
          isInvalid={attributionUrl !== '' && attributionText === ''}
          error={[
            i18n.translate('xpack.maps.xyztmssource.attributionText', {
              defaultMessage: 'Attribution url must have accompanying text',
            }),
          ]}
        >
          <EuiFieldText
            placeholder={'© OpenStreetMap contributors'}
            onChange={({ target }: ChangeEvent<HTMLInputElement>) =>
              this._handleTMSAttributionChange({ attributionText: target.value })
            }
          />
        </EuiFormRow>
        <EuiFormRow
          label="Attribution link"
          isInvalid={attributionText !== '' && attributionUrl === ''}
          error={[
            i18n.translate('xpack.maps.xyztmssource.attributionLink', {
              defaultMessage: 'Attribution text must have an accompanying link',
            }),
          ]}
        >
          <EuiFieldText
            placeholder={'https://www.openstreetmap.org/copyright'}
            onChange={({ target }: ChangeEvent<HTMLInputElement>) =>
              this._handleTMSAttributionChange({ attributionUrl: target.value })
            }
          />
        </EuiFormRow>
      </EuiPanel>
    );
  }
}
