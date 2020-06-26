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
  currentLayerName: 'string';
  currentMinSourceZoom: number;
  currentMaxSourceZoom: number;
  currentFields: MVTFieldDescriptor[];
  previousLayerName: 'string';
  previousMinSourceZoom: number;
  previousMaxSourceZoom: number;
  previousFields: MVTFieldDescriptor[];
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
  state = {
    currentLayerName: '',
    currentMinSourceZoom: MIN_ZOOM,
    currentMaxSourceZoom: MAX_ZOOM,
    currentFields: [],
    previousLayerName: '',
    previousMinSourceZoom: MIN_ZOOM,
    previousMaxSourceZoom: MAX_ZOOM,
    previousFields: [],
  };

  static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    const newSettings = {
      layerName: nextProps.layerName,
      fields: nextProps.fields,
      minSourceZoom: nextProps.minSourceZoom,
      maxSourceZoom: nextProps.maxSourceZoom,
    };

    const previous = prevState
      ? {
          layerName: prevState.previousLayerName,
          fields: prevState.previousFields,
          minSourceZoom: prevState.previousMinSourceZoom,
          maxSourceZoom: prevState.previousMaxSourceZoom,
        }
      : null;

    if (_.isEqual(previous, newSettings)) {
      return null;
    }

    const clonedFields = _.cloneDeep(nextProps.fields);
    return {
      currentLayerName: nextProps.layerName,
      currentMinSourceZoom: nextProps.minSourceZoom,
      currentMaxSourceZoom: nextProps.maxSourceZoom,
      currentFields: clonedFields,
      previousLayerName: nextProps.layerName,
      previousMinSourceZoom: nextProps.minSourceZoom,
      previousMaxSourceZoom: nextProps.maxSourceZoom,
      previousFields: clonedFields,
    };
  }

  _handleChange = _.debounce(() => {
    this.props.handleChange({
      layerName: this.state.currentLayerName,
      minSourceZoom: this.state.currentMinSourceZoom,
      maxSourceZoom: this.state.currentMaxSourceZoom,
      fields: this.state.currentFields,
    });
  }, 200);

  _handleLayerNameInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const layerName = e.target.value;
    if (layerName === this.state.currentLayerName) {
      return;
    }
    this.setState({ currentLayerName: layerName }, this._handleChange);
  };

  _handleFieldChange = (fields: MVTFieldDescriptor[]) => {
    if (_.isEqual(this.state.currentFields, fields)) {
      return;
    }
    this.setState({ currentFields: fields }, this._handleChange);
  };

  _handleZoomRangeChange = (e: Value) => {
    const minSourceZoom = parseInt(e[0] as string, 10);
    const maxSourceZoom = parseInt(e[1] as string, 10);
    if (
      this.state.currentMinSourceZoom === minSourceZoom &&
      this.state.currentMaxSourceZoom === maxSourceZoom
    ) {
      return;
    }
    this.setState(
      { currentMinSourceZoom: minSourceZoom, currentMaxSourceZoom: maxSourceZoom },
      this._handleChange
    );
  };

  render() {
    const fieldEditor = this.props.includeFields ? (
      <EuiFormRow
        label={i18n.translate('xpack.maps.source.MVTSingleLayerVectorSourceEditor.fieldsMessage', {
          defaultMessage: 'Fields',
        })}
      >
        <MVTFieldConfigEditor
          fields={this.state.currentFields.slice()}
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
            value={this.state.currentLayerName}
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
            value={[this.state.currentMinSourceZoom, this.state.currentMaxSourceZoom]}
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
