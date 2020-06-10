/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { EuiTitle, EuiPanel, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

// @ts-ignore
import { TooltipSelector } from '../../../components/tooltip_selector';
import { MVTField } from '../../fields/mvt_field';
import { MVTSingleLayerVectorSource } from './mvt_single_layer_vector_source';
import { MVTSingleLayerVectorSourceEditor } from './mvt_single_layer_vector_source_editor';
import { MVTSingleLayerSourceSettings } from './mvt_single_layer_source_settings';
import { MVTFieldDescriptor } from '../../../../common/descriptor_types';

export interface Props {
  tooltipFields: MVTFields[];
  onChange: (fields: MVTFields[]) => void;
  source: MVTSingleLayerVectorSource;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface State {
  fields: null | MVTField[];
}

export class UpdateSourceEditor extends Component<Props, State> {
  state = {
    fields: null,
  };

  readonly _isMounted: boolean;

  componentDidMount() {
    this._isMounted = true;
    this._loadFields();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadFields() {
    const fields = await this.props.source.getFields();
    if (this._isMounted) {
      this.setState({ fields });
    }
  }

  _onTooltipPropertiesSelect = (propertyNames: string[]) => {
    this.props.onChange({ propName: 'tooltipProperties', value: propertyNames });
  };

  _handleLayerNameInputChange = (layerName: string) => {
    console.log('ln', layerName);
    this.props.onChange({ propName: 'layerName', value: layerName });
  };

  _handleFieldChange = (fields: MVTFieldDescriptor[]) => {
    console.log('f', fields);
    this.props.onChange({ propName: 'fields', value: fields });
  };

  _handleZoomRangeChange = ({
    minSourceZoom,
    maxSourceZoom,
  }: {
    minSourceZoom: number;
    maxSourceZoom: number;
  }) => {
    console.log('zr', minSourceZoom, maxSourceZoom);
    this.props.onChange({ propName: 'minSourceZoom', value: minSourceZoom });
    this.props.onChange({ propName: 'maxSourceZoom', value: maxSourceZoom });
  };

  _renderSourceSettingsCard() {
    console.log(this.props.source);

    const fields: MVTFieldDescriptor[] = (this.state.fields || []).map((field: MVTField) => {
      return field.getMVTFieldDescriptor();
    });

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
            handleLayerNameInputChange={this._handleLayerNameInputChange}
            handleFieldChange={this._handleFieldChange}
            handleZoomRangeChange={this._handleZoomRangeChange}
            layerName={this.props.source.getLayerName() || ''}
            fields={fields}
            minSourceZoom={this.props.source.getMinZoom()}
            maxSourceZoom={this.props.source.getMaxZoom()}
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
            fields={this.state.fields ? this.state.fields : []} // all the fields in the source
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
