/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { XYZTMSSource } from '../../shared/layers/sources/xyz_tms_source';
import { EMSFileSource } from '../../shared/layers/sources/ems_file_source';
import { KibanaRegionmapSource } from '../../shared/layers/sources/kibana_regionmap_source';
import { KibanaTilemapSource } from '../../shared/layers/sources/kibana_tilemap_source';
import { ESGeohashGridSource } from '../../shared/layers/sources/es_geohashgrid_source';
import { ESSearchSource } from '../../shared/layers/sources/es_search_source';
import {
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
  EuiSuperSelect,
} from '@elastic/eui';

export class AddLayerPanel extends React.Component {

  constructor() {
    super();

    this.state = {
      label: '',
      sourceType: '',
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

  _onSourceTypeChange = (sourceType) => {
    this.setState({
      sourceType,
    });

    if (this.layer) {
      this.props.removeLayer(this.layer.getId());
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

  _renderSourceSelect() {
    this.sourceOptions = [
      {
        value: EMSFileSource.type,
        inputDisplay: EMSFileSource.typeDisplayName,
        dropdownDisplay: (
          <Fragment>
            <strong>{EMSFileSource.typeDisplayName}</strong>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              <p className="euiTextColor--subdued">Political boundry vectors such as world countries and country regions.</p>
            </EuiText>
          </Fragment>
        ),
      },
      {
        value: XYZTMSSource.type,
        inputDisplay: XYZTMSSource.typeDisplayName,
        dropdownDisplay: (
          <Fragment>
            <strong>{XYZTMSSource.typeDisplayName}</strong>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              <p className="euiTextColor--subdued">Tile Map Service with XYZ url.</p>
            </EuiText>
          </Fragment>
        ),
      },
      {
        value: ESGeohashGridSource.type,
        inputDisplay: ESGeohashGridSource.typeDisplayName,
        dropdownDisplay: (
          <Fragment>
            <strong>{ESGeohashGridSource.typeDisplayName}</strong>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              <p className="euiTextColor--subdued">
                Elasticsearch GeoHash grid aggregation groups documents into buckets that represent cells in a grid.
                Use this source with large indices and high zoom levels.
              </p>
            </EuiText>
          </Fragment>
        ),
      },
      {
        value: ESSearchSource.type,
        inputDisplay: ESSearchSource.typeDisplayName,
        dropdownDisplay: (
          <Fragment>
            <strong>{ESSearchSource.typeDisplayName}</strong>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              <p className="euiTextColor--subdued">
                Vectors created from elasticsearch documents.
              </p>
            </EuiText>
          </Fragment>
        ),
      }
    ];

    return (
      <EuiFormRow
        label="Source"
      >
        <EuiSuperSelect
          itemClassName="sourceSelectItem"
          options={this.sourceOptions}
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

    switch(this.state.sourceType) {
      case EMSFileSource.type:
        return EMSFileSource.renderEditor(editorProperties);
      case XYZTMSSource.type:
        return XYZTMSSource.renderEditor(editorProperties);
      case ESGeohashGridSource.type:
        return ESGeohashGridSource.renderEditor(editorProperties);
      case ESSearchSource.type:
        return ESSearchSource.renderEditor(editorProperties);
      default:
        throw new Error(`Unexepected source type: ${this.state.sourceType}`);
    }
  }

  _renderAddLayerForm() {
    return (
      <EuiForm>
        <EuiFormRow
          label="Label"
        >
          <EuiFieldText
            value={this.state.label}
            onChange={this._onLabelChange}
            aria-label="layer display name"
          />
        </EuiFormRow>

        {this._renderSourceSelect()}

        {this._renderSourceEditor()}

      </EuiForm>
    );
  }

  _renderFlyout() {
    return (
      <EuiFlyout onClose={this.props.closeFlyout} size="s">
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
