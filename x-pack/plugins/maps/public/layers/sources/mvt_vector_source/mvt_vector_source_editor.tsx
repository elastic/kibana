/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import _ from 'lodash';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MAX_ZOOM, MIN_ZOOM } from '../../../../common/constants';
import { ValidatedDualRange, Value } from '../../../../../../../src/plugins/kibana_react/public';

export class MVTVectorSourceEditor extends React.Component {
  state = {
    urlTemplate: '',
    layerName: '',
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    mvtCanPreview: false,
  };

  _sourceConfigChange = _.debounce(() => {
    if (this.state.mvtCanPreview && this.state.layerName) {
      this.props.onSourceConfigChange({
        urlTemplate: this.state.urlTemplate,
        layerName: this.state.layerName,
        minZoom: this.state.minZoom,
        maxZoom: this.state.maxZoom,
      });
    }
  }, 200);

  // @ts-ignore
  _handleUrlTemplateChange = e => {
    const url = e.target.value;

    const canPreview =
      url.indexOf('{x}') >= 0 && url.indexOf('{y}') >= 0 && url.indexOf('{z}') >= 0;
    this.setState(
      {
        urlTemplate: url,
        mvtCanPreview: canPreview,
      },
      () => this._sourceConfigChange()
    );
  };

  // @ts-ignore
  _handleLayerNameInputChange = e => {
    const layerName = e.target.value;
    this.setState(
      {
        layerName,
      },
      () => this._sourceConfigChange()
    );
  };

  _handleZoomRangeChange = (e: Value) => {
    const minZoom = parseInt(e[0] as string, 10);
    const maxZoom = parseInt(e[1] as string, 10);

    if (this.state.minZoom !== minZoom || this.state.maxZoom !== maxZoom) {
      this.setState({ minZoom, maxZoom }, () => this._sourceConfigChange());
    }
  };

  render() {
    return (
      <Fragment>
        <EuiFormRow label="Url">
          <EuiFieldText value={this.state.urlTemplate} onChange={this._handleUrlTemplateChange} />
        </EuiFormRow>
        <EuiFormRow label="Layer name">
          <EuiFieldText value={this.state.layerName} onChange={this._handleLayerNameInputChange} />
        </EuiFormRow>
        <ValidatedDualRange
          label={i18n.translate('xpack.maps.source.mvtVectorSource.dataZoomRangeLabel', {
            defaultMessage: 'Data Range',
          })}
          formRowDisplay="columnCompressed"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          value={[this.state.minZoom, this.state.maxZoom]}
          showInput="inputWithPopover"
          showRange
          showLabels
          onChange={this._handleZoomRangeChange}
          allowEmptyRange={false}
          compressed
          prepend={i18n.translate('xpack.maps.source.mvtVectorSource.dataZoomRangeMessage', {
            defaultMessage: 'Zoom levels',
          })}
        />
      </Fragment>
    );
  }
}
