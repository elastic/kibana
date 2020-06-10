/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import React, { Fragment, Component, ChangeEvent } from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MAX_ZOOM, MIN_ZOOM } from '../../../../common/constants';
import { ValidatedDualRange, Value } from '../../../../../../../src/plugins/kibana_react/public';
import { MVTFieldConfigEditor } from './mvt_field_config_editor';
import { MVTFieldDescriptor } from '../../../../common/descriptor_types';

export interface Props {
  handleLayerNameInputChange: (layerName: string) => void;
  handleFieldChange: (fields: MVTFieldDescriptor[]) => void;
  handleZoomRangeChange: ({ minSourceZoom: number, maxSourceZoom: number }) => void;
  layerName: string;
  fields: MVTFieldDescriptor[];
  minSourceZoom: number;
  maxSourceZoom: number;
}

export class MVTSingleLayerSourceSettings extends Component<Props, State> {
  _handleLayerNameInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const layerName = e.target.value;
    this.props.handleLayerNameInputChange(layerName);
  };

  _handleFieldChange = (fields: MVTFieldDescriptor[]) => {
    this.props.handleFieldChange(fields);
  };

  _handleZoomRangeChange = (e: Value) => {
    const minSourceZoom = parseInt(e[0] as string, 10);
    const maxSourceZoom = parseInt(e[1] as string, 10);
    this.props.handleZoomRangeChange({ minSourceZoom, maxSourceZoom });
  };

  render() {
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
          <EuiFieldText value={this.props.layerName} onChange={this._handleLayerNameInputChange} />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate(
            'xpack.maps.source.MVTSingleLayerVectorSourceEditor.layerNameMessage',
            {
              defaultMessage: 'Fields',
            }
          )}
        >
          <MVTFieldConfigEditor fields={this.props.fields} onChange={this._handleFieldChange} />
        </EuiFormRow>
        <ValidatedDualRange
          label=""
          formRowDisplay="columnCompressed"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          value={[this.props.minSourceZoom, this.props.maxSourceZoom]}
          showInput="inputWithPopover"
          showRange
          showLabels
          onChange={this._handleZoomRangeChange}
          allowEmptyRange={false}
          compressed
          prepend={i18n.translate(
            'xpack.maps.source.MVTSingleLayerVectorSourceEditor.dataZoomRangeMessage',
            {
              defaultMessage: 'Zoom levels',
            }
          )}
        />
      </Fragment>
    );
  }
}
