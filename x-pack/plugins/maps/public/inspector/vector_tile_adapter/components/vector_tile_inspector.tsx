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
import { EuiComboBox, EuiComboBoxOptionOption, EuiSpacer, EuiTabs, EuiTab } from '@elastic/eui';
import { EmptyPrompt } from './empty_prompt';
import type { TileRequest } from '../types';
import { TileRequestTab } from './tile_request_tab';
import { RequestsViewCallout } from './requests_view_callout';

interface Props {
  adapters: Adapters;
}

interface State {
  selectedLayer: EuiComboBoxOptionOption<string> | null;
  selectedTileRequest: TileRequest | null;
  tileRequests: TileRequest[];
  layerOptions: Array<EuiComboBoxOptionOption<string>>;
}

class VectorTileInspector extends Component<Props, State> {
  private _isMounted = false;

  state: State = {
    selectedLayer: null,
    selectedTileRequest: null,
    tileRequests: [],
    layerOptions: [],
  };

  componentDidMount() {
    this._isMounted = true;
    this._onAdapterChange();
    this.props.adapters.vectorTiles.on('change', this._debouncedOnAdapterChange);
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.props.adapters.vectorTiles.removeListener('change', this._debouncedOnAdapterChange);
  }

  _onAdapterChange = () => {
    const layerOptions = this.props.adapters.vectorTiles.getLayerOptions() as Array<
      EuiComboBoxOptionOption<string>
    >;
    if (layerOptions.length === 0) {
      this.setState({
        selectedLayer: null,
        selectedTileRequest: null,
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
    const tileRequests = this.props.adapters.vectorTiles.getTileRequests(selectedLayer.value);
    const selectedTileRequest =
      this.state.selectedTileRequest &&
      tileRequests.some((tileRequest: TileRequest) => {
        return (
          this.state.selectedTileRequest?.layerId === tileRequest.layerId &&
          this.state.selectedTileRequest?.x === tileRequest.x &&
          this.state.selectedTileRequest?.y === tileRequest.y &&
          this.state.selectedTileRequest?.z === tileRequest.z
        );
      })
        ? this.state.selectedTileRequest
        : tileRequests.length
        ? tileRequests[0]
        : null;

    this.setState({
      selectedLayer,
      selectedTileRequest,
      tileRequests,
      layerOptions,
    });
  };

  _debouncedOnAdapterChange = _.debounce(() => {
    if (this._isMounted) {
      this._onAdapterChange();
    }
  }, 256);

  _onLayerSelect = (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    if (selectedOptions.length === 0) {
      this.setState({
        selectedLayer: null,
        selectedTileRequest: null,
        tileRequests: [],
      });
      return;
    }

    const selectedLayer = selectedOptions[0];
    const tileRequests = this.props.adapters.vectorTiles.getTileRequests(selectedLayer.value);
    this.setState({
      selectedLayer,
      selectedTileRequest: tileRequests.length ? tileRequests[0] : null,
      tileRequests,
    });
  };

  renderTabs() {
    return this.state.tileRequests.map((tileRequest) => {
      const tileLabel = `${tileRequest.z}/${tileRequest.x}/${tileRequest.y}`;
      return (
        <EuiTab
          key={`${tileRequest.layerId}${tileLabel}`}
          onClick={() => {
            this.setState({ selectedTileRequest: tileRequest });
          }}
          isSelected={
            tileRequest.layerId === this.state.selectedTileRequest?.layerId &&
            tileRequest.x === this.state.selectedTileRequest?.x &&
            tileRequest.y === this.state.selectedTileRequest?.y &&
            tileRequest.z === this.state.selectedTileRequest?.z
          }
        >
          {tileLabel}
        </EuiTab>
      );
    });
  }

  render() {
    return this.state.layerOptions.length === 0 ? (
      <>
        <RequestsViewCallout />
        <EmptyPrompt />
      </>
    ) : (
      <>
        <RequestsViewCallout />
        <EuiSpacer />
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
        <EuiSpacer />
        <EuiTabs size="s">{this.renderTabs()}</EuiTabs>
        <EuiSpacer size="s" />
        {this.state.selectedTileRequest && (
          <TileRequestTab
            key={`${this.state.selectedTileRequest.layerId}${this.state.selectedTileRequest.x}${this.state.selectedTileRequest.y}${this.state.selectedTileRequest.z}`}
            tileRequest={this.state.selectedTileRequest}
          />
        )}
      </>
    );
  }
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export default VectorTileInspector;
