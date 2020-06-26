/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { EuiTitle, EuiPanel, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { TooltipSelector } from '../../../components/tooltip_selector';
import { MVTField } from '../../fields/mvt_field';
import { MVTSingleLayerVectorSource } from './mvt_single_layer_vector_source';
import { MVTSettings, MVTSingleLayerSourceSettings } from './mvt_single_layer_source_settings';
import { MVTFieldDescriptor } from '../../../../common/descriptor_types';
import { OnSourceChangeArgs } from '../../../connected_components/layer_panel/view';

export interface Props {
  tooltipFields: MVTField[];
  onChange: (...args: OnSourceChangeArgs[]) => void;
  source: MVTSingleLayerVectorSource;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface State {}

export class UpdateSourceEditor extends Component<Props, State> {
  _onTooltipPropertiesSelect = (propertyNames: string[]) => {
    this.props.onChange({ propName: 'tooltipProperties', value: propertyNames });
  };

  _handleChange = (settings: MVTSettings) => {
    this.props.onChange(
      { propName: 'layerName', value: settings.layerName },
      { propName: 'fields', value: settings.fields },
      { propName: 'minSourceZoom', value: settings.minSourceZoom },
      { propName: 'maxSourceZoom', value: settings.maxSourceZoom }
    );
  };

  _renderSourceSettingsCard() {
    return (
      <Fragment>
        <EuiPanel>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.maps.mvtSource.sourceSettings"
                defaultMessage="Source settings"
              />
            </h5>
          </EuiTitle>
          <EuiSpacer size="m" />
          <MVTSingleLayerSourceSettings
            handleChange={this._handleChange}
            layerName={this.props.source.getLayerName() || ''}
            fields={this.props.source.getFieldDescriptors()}
            minSourceZoom={this.props.source.getMinZoom()}
            maxSourceZoom={this.props.source.getMaxZoom()}
            includeFields={true}
          />
        </EuiPanel>

        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  _renderTooltipSelectionCard() {
    return (
      <Fragment>
        <EuiPanel>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.maps.mvtSource.tooltipsTitle"
                defaultMessage="Tooltip fields"
              />
            </h5>
          </EuiTitle>

          <EuiSpacer size="m" />

          <TooltipSelector
            tooltipFields={this.props.tooltipFields} // selected fields in the tooltip
            onChange={this._onTooltipPropertiesSelect}
            fields={this.props.source.getFieldDescriptors()} // all the fields in the source
          />
        </EuiPanel>

        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  render() {
    return (
      <Fragment>
        {this._renderSourceSettingsCard()}
        {this._renderTooltipSelectionCard()}
      </Fragment>
    );
  }
}
