/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { XYZTMSSource } from '../../shared/layers/sources/xyz_tms_source';
import { EMSFileSource } from '../../shared/layers/sources/ems_file_source';
import { KibanaRegionmapSource } from '../../shared/layers/sources/kibana_regionmap_source';
import { KibanaTilemapSource } from '../../shared/layers/sources/kibana_tilemap_source';
import { ESGeohashGridSource } from '../../shared/layers/sources/es_geohashgrid_source';
import { ESSearchSource } from '../../shared/layers/sources/es_search_source';
import {
  EuiAccordion,
  EuiText,
  EuiSpacer,
  EuiButton,
  EuiFlyout,
  EuiFlyoutBody,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiTitle,
  EuiTextColor,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
} from '@elastic/eui';

export class AddLayerPanel extends React.Component {

  constructor() {
    super();

    this.state = {
      label: '',
    };
  }

  _previewLayer = (source) => {
    this.layer = source.createDefaultLayer({
      temporary: true,
      label: this.state.label,
    });
    this.props.previewLayer(this.layer);
  }

  _onLabelChange = (event) => {
    this.setState({
      label: event.target.value,
    });

    if (this.layer) {
      this.props.updateLayerLabel(this.layer.getId(), event.target.value);
    }
  }

  _renderAddToMapBtn() {
    const { layerLoading, temporaryLayers, addAction } = this.props;
    const addToMapBtnText = 'Add to map';
    return (
      <EuiButton
        style={{ width: '10rem' }}
        disabled={!temporaryLayers || layerLoading}
        isLoading={layerLoading}
        iconType={temporaryLayers && !layerLoading ? 'check' : undefined}
        onClick={() => addAction()}
        fill
      >
        {addToMapBtnText}
      </EuiButton>
    );
  }

  _renderAddLayerForm() {
    const editorProperties = {
      onPreviewSource: this._previewLayer,
      dataSourcesMeta: this.props.dataSourcesMeta
    };
    const xyzTmsEditor = XYZTMSSource.renderEditor(editorProperties);
    const emsFileEditor = EMSFileSource.renderEditor(editorProperties);
    const regionmapEditor = KibanaRegionmapSource.renderEditor(editorProperties);
    const heatmapEditor = ESGeohashGridSource.renderEditor(editorProperties);
    const esSearchEditor = ESSearchSource.renderEditor(editorProperties);
    const tilemapEditor = KibanaTilemapSource.renderEditor(editorProperties);

    return (
      <EuiForm>
        <EuiFormRow
          label="Display name"
        >
          <EuiFieldText
            value={this.state.label}
            onChange={this._onLabelChange}
            aria-label="layer display name"
          />
        </EuiFormRow>

        <EuiAccordion
          id="ems"
          buttonContent="From Elastic Maps Service"
          paddingSize="l"
        >
          {emsFileEditor}
        </EuiAccordion>

        <EuiSpacer size="l"/>
        <EuiAccordion
          id="xyz"
          buttonContent="Tilemap service with XYZ url"
          paddingSize="l"
        >
          {xyzTmsEditor}
        </EuiAccordion>

        <EuiSpacer size="l"/>
        <EuiAccordion
          id="es_geohash_grid"
          buttonContent="Elasticsearch GeoHash grid Aggregation"
          paddingSize="l"
        >
          {heatmapEditor}
        </EuiAccordion>

        <EuiSpacer size="l"/>
        <EuiAccordion
          id="es_search"
          buttonContent="Elasticsearch documents"
          paddingSize="l"
        >
          {esSearchEditor}
        </EuiAccordion>

        <EuiSpacer size="l"/>
        <EuiAccordion
          id="kibana_config"
          buttonContent="From Kibana Config"
          paddingSize="l"
        >
          {regionmapEditor}
          <EuiSpacer size="l"/>
          {tilemapEditor}
        </EuiAccordion>
      </EuiForm>
    );
  }

  _renderFlyout() {
    return (
      <EuiFlyout onClose={this.props.closeFlyout} style={{ maxWidth: 768 }}>
        <EuiFlyoutHeader>
          <EuiTitle size="l">
            <h2>Add layer</h2>
          </EuiTitle>
          <EuiSpacer size="m"/>
          <EuiTextColor color="subdued">
            <EuiText size="s">
              <p>Choose a source from one of the following options, then click Add to map to continue.</p>
            </EuiText>
          </EuiTextColor>
          <EuiSpacer/>
          <EuiHorizontalRule margin="none"/>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          {this._renderAddLayerForm()}
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
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
              {this._renderAddToMapBtn()}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }

  render() {
    return (this.props.flyoutVisible) ? this._renderFlyout() : null;
  }
}
