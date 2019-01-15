/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { ALL_SOURCES } from '../../shared/layers/sources/all_sources';
import {
  EuiSpacer,
  EuiButton,
  EuiHorizontalRule,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiPanel,
  EuiCard,
  EuiIcon,
} from '@elastic/eui';

export class AddLayerPanel extends Component {

  constructor() {
    super();

    this.state = {
      sourceType: null,
    };
  }

  _previewLayer = (source) => {
    this.layer = source.createDefaultLayer({
      temporary: true,
    });
    this.props.previewLayer(this.layer);
  };

  _clearSource = () => {
    this.setState({ sourceType: null });

    if (this.layer) {
      this.props.removeLayer(this.layer.getId());
    }
  }

  _onSourceTypeChange = (sourceType) => {
    this.setState({ sourceType });
  }

  _renderNextBtn() {
    if (!this.state.sourceType) {
      return null;
    }

    const { layerLoading, temporaryLayers, nextAction } = this.props;
    return (
      <EuiButton
        disabled={!temporaryLayers || layerLoading}
        isLoading={layerLoading}
        iconSide="right"
        iconType={'sortRight'}
        onClick={() => {
          const layerId = this.layer.getId();
          this.layer = null;
          return nextAction(layerId);
        }}
        fill
      >
        Create layer
      </EuiButton>
    );
  }

  _renderSourceCards() {
    return ALL_SOURCES.map(Source => {
      const icon = Source.icon
        ? <EuiIcon type={Source.icon} size="xl" />
        : null;
      return (
        <EuiCard
          key={Source.type}
          title={Source.title}
          icon={icon}
          onClick={() => this._onSourceTypeChange(Source.type)}
          description={Source.description}
          layout="horizontal"
        />
      );
    });
  }

  _renderSourceSelect() {
    return (
      <Fragment>
        <EuiTitle size="xs">
          <h2>Choose data source</h2>
        </EuiTitle>
        {this._renderSourceCards()}
      </Fragment>
    );
  }

  _renderSourceEditor() {
    const editorProperties = {
      onPreviewSource: this._previewLayer,
      dataSourcesMeta: this.props.dataSourcesMeta
    };

    const Source = ALL_SOURCES.find((Source) => {
      return Source.type === this.state.sourceType;
    });
    if (!Source) {
      throw new Error(`Unexepected source type: ${this.state.sourceType}`);
    }

    return (
      <Fragment>
        <EuiButtonEmpty
          contentProps={{ style: { justifyContent: 'left' } }}
          onClick={this._clearSource}
          iconType="arrowLeft"
        >
          Change data source
        </EuiButtonEmpty>
        <EuiPanel>
          {Source.renderEditor(editorProperties)}
        </EuiPanel>
      </Fragment>
    );
  }

  _renderAddLayerForm() {
    if (!this.state.sourceType) {
      return this._renderSourceSelect();
    }

    return this._renderSourceEditor();
  }

  _renderFlyout() {
    return (
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
      >
        <EuiFlexItem grow={false} className="gisViewPanel__header">
          <EuiTitle size="s">
            <h1>Add layer</h1>
          </EuiTitle>
          <EuiSpacer size="m"/>
          <EuiHorizontalRule margin="none"/>
        </EuiFlexItem>

        <EuiFlexItem className="gisViewPanel__body">
          {this._renderAddLayerForm()}
        </EuiFlexItem>

        <EuiFlexItem grow={false} className="gisViewPanel__footer">
          <EuiHorizontalRule margin="none"/>
          <EuiSpacer size="m"/>
          <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={this.props.closeFlyout}
                flush="left"
              >
                Cancel
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {this._renderNextBtn()}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  render() {
    return (this.props.flyoutVisible) ? this._renderFlyout() : null;
  }
}
