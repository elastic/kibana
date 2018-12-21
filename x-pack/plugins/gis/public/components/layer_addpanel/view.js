/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { XYZTMSSource } from '../../shared/layers/sources/xyz_tms_source';
import { WMSSource } from '../../shared/layers/sources/wms_source';
import { EMSFileSource } from '../../shared/layers/sources/ems_file_source';
import { ESGeohashGridSource } from '../../shared/layers/sources/es_geohashgrid_source';
import { ESSearchSource } from '../../shared/layers/sources/es_search_source';
import { KibanaRegionmapSource } from '../../shared/layers/sources/kibana_regionmap_source';

import {
  EuiText,
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
    const sourceOptions = [
      {
        value: ESSearchSource.type,
        inputDisplay: ESSearchSource.typeDisplayName,
        dropdownDisplay: (
          <Fragment>
            <strong>{ESSearchSource.typeDisplayName}</strong>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              <p className="euiTextColor--subdued">
                Display documents from an elasticsearch index.
              </p>
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
                Group documents into grid cells and display metrics for each cell.
                Great for displaying large datasets.
              </p>
            </EuiText>
          </Fragment>
        ),
      },
      {
        value: EMSFileSource.type,
        inputDisplay: EMSFileSource.typeDisplayName,
        dropdownDisplay: (
          <Fragment>
            <strong>{EMSFileSource.typeDisplayName}</strong>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              <p className="euiTextColor--subdued">Political boundry vectors hosted by EMS.</p>
            </EuiText>
          </Fragment>
        ),
      },
      {
        value: KibanaRegionmapSource.type,
        inputDisplay: KibanaRegionmapSource.typeDisplayName,
        dropdownDisplay: (
          <Fragment>
            <strong>{KibanaRegionmapSource.typeDisplayName}</strong>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              <p className="euiTextColor--subdued">
                Region map boundary layers configured in your config/kibana.yml file.
              </p>
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
        value: WMSSource.type,
        inputDisplay: WMSSource.typeDisplayName,
        dropdownDisplay: (
          <Fragment>
            <strong>{WMSSource.typeDisplayName}</strong>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              <p className="euiTextColor--subdued">Web Map Service (WMS)</p>
            </EuiText>
          </Fragment>
        ),
      },
    ];

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

    switch(this.state.sourceType) {
      case EMSFileSource.type:
        return EMSFileSource.renderEditor(editorProperties);
      case XYZTMSSource.type:
        return XYZTMSSource.renderEditor(editorProperties);
      case ESGeohashGridSource.type:
        return ESGeohashGridSource.renderEditor(editorProperties);
      case ESSearchSource.type:
        return ESSearchSource.renderEditor(editorProperties);
      case KibanaRegionmapSource.type:
        return KibanaRegionmapSource.renderEditor(editorProperties);
      case WMSSource.type:
        return WMSSource.renderEditor(editorProperties);
      default:
        throw new Error(`Unexepected source type: ${this.state.sourceType}`);
    }
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
