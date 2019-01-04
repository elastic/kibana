/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ALL_SOURCES } from '../../shared/layers/sources/all_sources';
import {
  EuiSpacer,
  EuiButton,
  EuiHorizontalRule,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiForm,
  EuiFormRow,
  EuiSuperSelect,
  EuiPanel,
} from '@elastic/eui';

export class AddLayerPanel extends React.Component {

  constructor() {
    super();

    this.state = {
      label: '',
      sourceType: '',
      minZoom: 0,
      maxZoom: 24,
      alphaValue: 1
    };
  }

  componentDidUpdate() {
    if (this.layer && this.state.alphaValue === null) {
      const defaultAlphaValue = this.layer._descriptor.type === 'TILE' ? 1 : 1;
      if (this.state.alphaValue !== defaultAlphaValue) {
        this.setState({
          alphaValue: defaultAlphaValue
        });
      }
    }
  }

  _previewLayer = (source) => {
    this.layer = source.createDefaultLayer({
      temporary: true,
      label: this.state.label,
      minZoom: this.state.minZoom,
      maxZoom: this.state.maxZoom,
    });
    this.props.previewLayer(this.layer);
  };

  _onSourceTypeChange = (sourceType) => {
    this.setState({
      sourceType,
    });

    if (this.layer) {
      this.props.removeLayer(this.layer.getId());
    }
  }

  _renderNextBtn() {
    const { layerLoading, temporaryLayers, nextAction } = this.props;
    const addToMapBtnText = 'Next';
    return (
      <EuiButton
        style={{ width: '9rem' }}
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
        {addToMapBtnText}
      </EuiButton>
    );
  }

  _renderSourceSelect() {


    const sourceOptions = ALL_SOURCES.map(Source => {
      return {
        value: Source.type,
        inputDisplay: Source.typeDisplayName,
        dropdownDisplay: Source.renderDropdownDisplayOption()
      };
    });


    return (
      <EuiFormRow label="Data source">
        <EuiSuperSelect
          itemClassName="sourceSelectItem"
          options={sourceOptions}
          valueOfSelected={this.state.sourceType}
          onChange={this._onSourceTypeChange}
          itemLayoutAlign="top"
          hasDividers
        />
      </EuiFormRow>
    );
  }

  _renderSourceEditor() {
    if (!this.state.sourceType) {
      return;
    }

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

    return Source.renderEditor(editorProperties);
  }

  _renderAddLayerForm() {
    return (
      <EuiForm>
        {this._renderSourceSelect()}
        {this._renderSourceEditor()}
      </EuiForm>
    );
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
          <EuiPanel>
            {this._renderAddLayerForm()}
          </EuiPanel>
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
