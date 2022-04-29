/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import type { Adapters } from '@kbn/inspector-plugin/public';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { EmptyPrompt } from './empty_prompt';

interface Props {
  adapters: Adapters;
}

interface State {
  selectedLayerId: string | null;
  tileRequests: TileRequest[];
  layerOptions: Array<EuiComboBoxOptionOption<string>>;
}

class VectorTileViewComponent extends Component<Props, State> {
  private _isMounted = false;

  state: State = {
    selectedLayerId: null,
    tileRequests: [],
    layerOptions: [],
  };

  _onAdapterChange = () => {
    const layerOptions = this.props.adapters.vectorTiles.getLayerOptions();
    if (layerOptions.length === 0) {
      this.setState({
        selectedLayerId: null,
        tileRequests: [],
        layerOptions: [],
      });
      return;
    }

    const selectedLayerId =
      this.state.selectedLayerId &&
      layerOptions.some((layerOption) => {
        return this.state.selectedLayerId === layerOption.value;
      })
        ? this.state.selectedLayerId
        : layerOptions[0].value;

    this.setState({
      selectedLayerId,
      tileRequests: this.props.adapters.vectorTiles.getTileRequests(selectedLayerId),
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
        selectedLayerId: null,
        tileRequests: [],
      });
      return;
    }

    const selectedLayerId = selectedOptions[0].value;
    this.setState({
      selectedLayerId,
      tileRequests: this.props.adapters.vectorTiles.getTileRequests(selectedLayerId),
    });
  };

  render() {
    return this.state.layerOptions.length === 0 ? <EmptyPrompt /> : <div>Hello world</div>;
  }
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export default VectorTileViewComponent;
