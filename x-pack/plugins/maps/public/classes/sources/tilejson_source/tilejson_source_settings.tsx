/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component, ChangeEvent } from 'react';
import { EuiSelect, EuiFormRow, EuiText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import { TileJsonSource, TileJsonVectorLayerConfig } from './tilejson_source';
import { loadTileJsonDocument } from './tilejson_loader_util';
import { TileJsonVectorSourceSettings } from '../../../../common/descriptor_types';

export interface State {
  currentLayerName: string;
  previousLayerName: string;
  urlForDoc: string;
  tileJsonDoc: any;
  layers: TileJsonVectorLayerConfig[];
}

export interface Props {
  handleChange: (settings: Partial<TileJsonVectorSourceSettings>) => void;
  layerName: string;
  url: string[];
}

export class TileJsonSourceSettings extends Component<Props, State> {
  state = {
    currentLayerName: '',
    previousLayerName: '',
    urlForDoc: '',
    tileJsonDoc: null,
    layers: null,
  };

  static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    if (_.isEqual(nextProps.layerName, prevState.previousLayerName)) {
      return null;
    }

    return {
      currentLayerName: nextProps.layerName,
      previousLayerName: nextProps.layerName,
      urlForDoc: prevState.urlForDoc,
      tileJsonDoc: prevState.tileJsonDoc,
    };
  }

  _isMounted: boolean = false;

  componentDidMount(): void {
    this._isMounted = true;
    this._loadUrl();
  }

  componentWillUnmount(): void {
    this._isMounted = false;
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any): void {
    this._loadUrl();
  }

  async _loadUrl() {
    if (!this.props.url) {
      return;
    }
    if (this.state.urlForDoc === this.props.url) {
      return;
    }
    const url = this.props.url;
    let tileJsonDoc;
    try {
      tileJsonDoc = await loadTileJsonDocument(url);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      this.setState({
        urlForDoc: '',
        tileJsonDoc: null,
      });
      return;
    }
    if (this._isMounted && this.props.url === url) {
      const layers: TileJsonVectorLayerConfig[] = TileJsonSource.getLayerConfigsFromTileJson(
        tileJsonDoc
      );
      this.setState({
        urlForDoc: url,
        tileJsonDoc,
        currentLayer: layers[0],
        layers,
      });
    }
  }

  _handleChange = _.debounce(() => {
    const selectedLayer: TileJsonVectorLayerConfig = this.state.layers.find((l) => {
      return l.id === this.state.currentLayerName;
    });
    this.props.handleChange({
      layerName: this.state.currentLayerName,
      minSourceZoom: selectedLayer.minzoom,
      maxSourceZoom: selectedLayer.maxzoom,
    });
  }, 200);

  _handleLayerNameInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const layerName = e.target.value;
    if (layerName === this.state.currentLayerName) {
      return;
    }
    this.setState({ currentLayerName: layerName }, this._handleChange);
  };

  render() {
    if (!this.state.layers || !this.state.tileJsonDoc) {
      return null;
    }

    const description = this.state.tileJsonDoc.description;

    const layerOptions = this.state.layers.map((layer: TileJsonVectorLayerConfig) => {
      return {
        text: layer.id,
        value: layer.id,
      };
    });
    const selectedLayer = this.state.layers.find((l) => {
      return l.id === this.state.currentLayerName;
    });

    const zoomText = selectedLayer ? (
      <EuiText size={'xs'}>
        {i18n.translate('xpack.maps.source.TileJsonSourceSettings.zoomText', {
          defaultMessage: 'This layer has data from zoom level {minZoom} to {maxZoom}',
          values: {
            minZoom: selectedLayer.minzoom,
            maxZoom: selectedLayer.maxzoom,
          },
        })}
      </EuiText>
    ) : null;

    return (
      <Fragment>
        <EuiFormRow
          label={i18n.translate('xpack.maps.source.TileJsonSourceSettings.description', {
            defaultMessage: 'Description',
          })}
        >
          <EuiText size={'xs'}>{description}</EuiText>
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.maps.source.TileJsonSourceSettings.layerNameMessage', {
            defaultMessage: 'Layer name',
          })}
          helpText={i18n.translate(
            'xpack.maps.source.TileJsonSourceSettings.layerNameHelpMessage',
            {
              defaultMessage: 'Name of the target data layer in the tile',
            }
          )}
        >
          <>
            <EuiSelect
              value={this.state.currentLayerName}
              onChange={this._handleLayerNameInputChange}
              options={layerOptions}
            />
            <EuiSpacer size={'xs'} />
            {zoomText}
          </>
        </EuiFormRow>
      </Fragment>
    );
  }
}
