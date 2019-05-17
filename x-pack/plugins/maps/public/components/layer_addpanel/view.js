/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { SourceSelect } from './source_select/source_select';
import { FlyoutFooter } from './flyout_footer';
import { SourceEditor } from './source_editor';
import { ImportEditor } from './import_editor';
import {
  EuiFlexGroup,
  EuiTitle,
  EuiFlyoutHeader,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export class AddLayerPanel extends Component {

  state = {
    sourceType: null,
    layer: null,
    indexingTriggered: false,
    indexingComplete: false,
    importIndexingReady: false,
    importView: false,
  }

  _viewLayer = (source, fitToExtent = false) => {
    if (!source) {
      this.setState({ layer: null });
      this.props.removeTransientLayer();
      return;
    }

    const layerOptions = this.state.layer
      ? { style: this.state.layer.getCurrentStyle().getDescriptor() }
      : {};
    const layer = source.createDefaultLayer(layerOptions, this.props.mapColors);
    this.setState({ layer }, async () => {
      await this.props.viewLayer(this.state.layer);
      fitToExtent && this.props.fitToLayerExtent(layer.getId());
    });
  };

  _addImportedLayer = async source => {
    await this.props.removeTransientLayer();
    if (!source) {
      this.setState({ layer: null });
      console.error(`Failed to add source`);
      return;
    }
    this.setState({
      layer: source.createDefaultLayer({}, this.props.mapColors)
    }, () => this.props.addImportedLayer(this.state.layer));
  };

  _clearLayerData = ({ keepSourceType = false }) => {
    this.setState({
      layer: null,
      ...(!keepSourceType ? { sourceType: null, importView: false } : {}),
    });
    this.props.removeTransientLayer();
  }

  _onSourceSelectionChange = ({ type, indexReadyFile }) => {
    this.setState({ sourceType: type, importView: indexReadyFile });
  }

  _layerAddHandler = () => {
    const layerSource = this.state.layer.getSource();
    const boolIndexLayer = layerSource.shouldBeIndexed();
    this.setState({ layer: null });
    if (boolIndexLayer && !this.state.indexingTriggered) {
      this.setState({ indexingTriggered: true });
    } else {
      this.props.selectLayerAndAdd();
    }
  }

  _renderAddLayerPanel() {
    if (!this.state.sourceType) {
      return (
        <SourceSelect updateSourceSelection={this._onSourceSelectionChange} />
      );
    } else if (this.state.importView) {
      return (
        <ImportEditor
          clearSource={this._clearLayerData}
          previewLayer={source => this._viewLayer(source, this.state.importView)}
          addImportLayer={source => this._addImportedLayer(source)}
          indexingTriggered={this.state.indexingTriggered}
          onIndexReady={
            importIndexingReady => this.setState({ importIndexingReady })
          }
          onIndexSuccess={() => this.setState({ indexingComplete: true })}
          onIndexError={() => this.setState({ indexingComplete: true })}
          onRemove={() => this._clearLayerData({ keepSourceType: true })}
        />
      );
    } else {
      return (
        <SourceEditor
          clearSource={this._clearLayerData}
          sourceType={this.state.sourceType}
          previewLayer={source => this._viewLayer(source, this.state.importView)}
        />
      );
    }
  }

  _renderFooter() {
    if (!this.state.sourceType) {
      return null;
    }

    const {
      indexingTriggered, indexingComplete, importView, layer,
      importIndexingReady
    } = this.state;
    const isLayerAddReady = !importView && !!layer;
    const isImportPreviewReady = importView && importIndexingReady;
    const isImportCompleted = importView && indexingTriggered && indexingComplete;

    const buttonEnabled = isLayerAddReady || isImportPreviewReady || isImportCompleted;
    const buttonText = importView && !indexingTriggered && 'Import file'
      || 'Add layer';
    return (
      <FlyoutFooter
        onClick={this._layerAddHandler}
        disableButton={!buttonEnabled}
        buttonText={buttonText}
      />
    );
  }

  _renderFlyout() {
    const panelTitle = this.state.importView ? 'Import file' : 'Add layer';
    return (
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
      >
        <EuiFlyoutHeader hasBorder className="mapLayerPanel__header">
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.maps.addLayerPanel.panelTitle"
                defaultMessage={panelTitle}
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        <div className="mapLayerPanel__body" data-test-subj="layerAddForm">
          <div className="mapLayerPanel__bodyOverflow">
            { this._renderAddLayerPanel() }
          </div>
        </div>
        { this._renderFooter() }
      </EuiFlexGroup>
    );
  }

  render() {
    return (this.props.flyoutVisible) ? this._renderFlyout() : null;
  }
}
