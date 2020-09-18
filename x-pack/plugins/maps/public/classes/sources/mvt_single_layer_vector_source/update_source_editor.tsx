/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component, Fragment } from 'react';
import { EuiTitle, EuiPanel, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { TooltipSelector } from '../../../components/tooltip_selector';
import { MVTField } from '../../fields/mvt_field';
import { MVTSingleLayerVectorSource } from './mvt_single_layer_vector_source';
import { MVTSettings, MVTSingleLayerSourceSettings } from './mvt_single_layer_source_settings';
import { OnSourceChangeArgs } from '../../../connected_components/layer_panel/view';
import { MVTFieldDescriptor } from '../../../../common/descriptor_types';

interface Props {
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
    const changes: OnSourceChangeArgs[] = [];
    if (settings.layerName !== this.props.source.getLayerName()) {
      changes.push({ propName: 'layerName', value: settings.layerName });
    }
    if (settings.minSourceZoom !== this.props.source.getMinZoom()) {
      changes.push({ propName: 'minSourceZoom', value: settings.minSourceZoom });
    }
    if (settings.maxSourceZoom !== this.props.source.getMaxZoom()) {
      changes.push({ propName: 'maxSourceZoom', value: settings.maxSourceZoom });
    }
    if (!_.isEqual(settings.fields, this._getFieldDescriptors())) {
      changes.push({ propName: 'fields', value: settings.fields });

      // Remove dangling tooltips.
      // This behaves similar to how stale styling properties are removed (e.g. on metric-change in agg sources)
      const sanitizedTooltips = [];
      for (let i = 0; i < this.props.tooltipFields.length; i++) {
        const tooltipName = this.props.tooltipFields[i].getName();
        for (let j = 0; j < settings.fields.length; j++) {
          if (settings.fields[j].name === tooltipName) {
            sanitizedTooltips.push(tooltipName);
            break;
          }
        }
      }

      if (!_.isEqual(sanitizedTooltips, this.props.tooltipFields)) {
        changes.push({ propName: 'tooltipProperties', value: sanitizedTooltips });
      }
    }
    this.props.onChange(...changes);
  };

  _getFieldDescriptors(): MVTFieldDescriptor[] {
    return this.props.source.getMVTFields().map((field: MVTField) => {
      return field.getMVTFieldDescriptor();
    });
  }

  _renderSourceSettingsCard() {
    const fieldDescriptors: MVTFieldDescriptor[] = this._getFieldDescriptors();
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
            fields={fieldDescriptors}
            minSourceZoom={this.props.source.getMinZoom()}
            maxSourceZoom={this.props.source.getMaxZoom()}
            showFields={true}
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
            fields={this.props.source.getMVTFields()} // all the fields in the source
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
