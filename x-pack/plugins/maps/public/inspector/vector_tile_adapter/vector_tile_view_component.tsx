/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import type { Adapters } from '@kbn/inspector-plugin/public';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { EmptyPrompt } from './empty_prompt';
import type { TileRequest } from './types';

interface Props {
  adapters: Adapters;
}

interface State {
  selectedLayer: EuiComboBoxOptionOption<string> | null;
  tileRequests: TileRequest[];
  layerOptions: Array<EuiComboBoxOptionOption<string>>;
}

class VectorTileViewComponent extends Component<Props, State> {
  private _isMounted = false;

  state: State = {
    selectedLayer: null,
    tileRequests: [],
    layerOptions: [],
  };

  _onAdapterChange = () => {
    const layerOptions = this.props.adapters.vectorTiles.getLayerOptions() as Array<
      EuiComboBoxOptionOption<string>
    >;
    if (layerOptions.length === 0) {
      this.setState({
        selectedLayer: null,
        tileRequests: [],
        layerOptions: [],
      });
      return;
    }

    const selectedLayer =
      this.state.selectedLayer &&
      layerOptions.some((layerOption) => {
        return this.state.selectedLayer?.value === layerOption.value;
      })
        ? this.state.selectedLayer
        : layerOptions[0];

    this.setState({
      selectedLayer,
      tileRequests: this.props.adapters.vectorTiles.getTileRequests(selectedLayer.value),
      layerOptions,
    });
  };

  _debouncedOnAdapterChange = _.debounce(() => {
    if (this._isMounted) {
      this._onAdapterChange();
    }
  }, 256);

  componentDidMount() {
    this._isMounted = true;
    this._onAdapterChange();
    this.props.adapters.map.on('change', this._debouncedOnAdapterChange);
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.props.adapters.map.removeListener('change', this._debouncedOnAdapterChange);
  }

  _onLayerSelect = (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    if (selectedOptions.length === 0) {
      this.setState({
        selectedLayer: null,
        tileRequests: [],
      });
      return;
    }

    this.setState({
      selectedLayer: selectedOptions[0],
      tileRequests: this.props.adapters.vectorTiles.getTileRequests(selectedOptions[0].value),
    });
  };

  render() {
    return this.state.layerOptions.length === 0 ? (
      <EmptyPrompt />
    ) : (
      <>
        <EuiComboBox
          singleSelection={true}
          options={this.state.layerOptions}
          selectedOptions={this.state.selectedLayer ? [this.state.selectedLayer] : []}
          onChange={this._onLayerSelect}
          isClearable={false}
          prepend={i18n.translate('xpack.maps.inspector.vectorTile.layerSelectPrepend', {
            defaultMessage: 'Layer',
          })}
        />
      </>
    );
  }
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export default VectorTileViewComponent;
