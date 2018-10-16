/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { XYZTMSSource } from '../../shared/layers/sources/xyz_tms_source';
import { EMSFileSource } from '../../shared/layers/sources/ems_file_source';
import { ESGeohashGridSource } from '../../shared/layers/sources/es_geohashgrid_source';
import { ESSearchSource } from '../../shared/layers/sources/es_search_source';
import {
  EuiText,
  EuiSpacer,
  EuiButton,
  EuiFlyout,
  EuiFlyoutBody,
  EuiButtonEmpty,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiTitle,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiSuperSelect,
  EuiSwitch,
  EuiRange,
} from '@elastic/eui';
import { toastNotifications } from 'ui/notify';

export class AddLayerPanel extends React.Component {

  constructor() {
    super();

    this.state = {
      label: '',
      sourceType: '',
      showAtAllZoomLevels: true,
      minZoom: 0,
      maxZoom: 24,
    };
  }

  shouldComponentUpdate(nextProps) {
    const { layerLoadToast } = nextProps;
    if (layerLoadToast === 'success') {
      toastNotifications.addSuccess('Layer added');
    } else if (layerLoadToast === 'error') {
      toastNotifications.addDanger('Error adding layer');
    } else {
      // Do nothing
      return false;
    }
    return true;
  }

  _previewLayer = (source) => {
    this.layer = source.createDefaultLayer({
      temporary: true,
      label: this.state.label,
      showAtAllZoomLevels: this.state.showAtAllZoomLevels,
      minZoom: this.state.minZoom,
      maxZoom: this.state.maxZoom,
    });
    this.props.previewLayer(this.layer);
  }

  _onLabelChange = (event) => {
    const label = event.target.value;
    this.setState({ label });

    if (this.layer) {
      this.props.updateLabel(this.layer.getId(), label);
    }
  }

  _onShowAtAllZoomLevelsChange = (event) => {
    const isChecked = event.target.checked;
    this.setState({
      showAtAllZoomLevels: isChecked,
    });

    if (this.layer) {
      this.props.updateShowAtAllZoomLevels(this.layer.getId(), isChecked);
    }
  };

  _onZoomRangeChange = () => {
    if (this.layer) {
      this.props.updateMinZoom(this.layer.getId(), this.state.minZoom);
      this.props.updateMaxZoom(this.layer.getId(), this.state.maxZoom);
    }
  }

  _onMinZoomChange = (event) => {
    const sanitizedValue = parseInt(event.target.value, 10);
    const minZoom = sanitizedValue >= 24 ? 23 : sanitizedValue;
    this.setState((prevState) => {
      if (minZoom >= prevState.maxZoom) {
        return {
          minZoom,
          maxZoom: minZoom + 1,
        };
      }

      return { minZoom };
    }, this._onZoomRangeChange);
  }

  _onMaxZoomChange = (event) => {
    const sanitizedValue = parseInt(event.target.value, 10);
    const maxZoom = sanitizedValue <= 0 ? 1 : sanitizedValue;
    this.setState((prevState) => {
      if (maxZoom <= prevState.minZoom) {
        return {
          minZoom: maxZoom - 1,
          maxZoom
        };
      }

      return { maxZoom };
    }, this._onZoomRangeChange);
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
        onClick={() => { this.layer = null; return addAction(); }}
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
        compressed
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

  _renderZoomSliders() {
    if (this.state.showAtAllZoomLevels) {
      return;
    }

    return (
      <Fragment>
        <EuiFormRow
          label="Min zoom"
          compressed
        >
          <EuiRange
            min={0}
            max={24}
            value={this.state.minZoom.toString()}
            onChange={this._onMinZoomChange}
            showInput
          />
        </EuiFormRow>

        <EuiFormRow
          label="Max zoom"
          compressed
        >
          <EuiRange
            min={0}
            max={24}
            value={this.state.maxZoom.toString()}
            onChange={this._onMaxZoomChange}
            showInput
          />
        </EuiFormRow>
      </Fragment>
    );
  }

  _renderAddLayerForm() {
    return (
      <EuiForm>
        <EuiFormRow
          label="Label"
          compressed
        >
          <EuiFieldText
            value={this.state.label}
            onChange={this._onLabelChange}
            aria-label="layer display name"
          />
        </EuiFormRow>

        <EuiFormRow compressed>
          <EuiSwitch
            label="Show layer at all zoom levels"
            checked={this.state.showAtAllZoomLevels}
            onChange={this._onShowAtAllZoomLevelsChange}
          />
        </EuiFormRow>
        {this._renderZoomSliders()}
        {this._renderSourceSelect()}
        {this._renderSourceEditor()}
      </EuiForm>
    );
  }

  _renderFlyout() {
    return (
      <EuiFlyout onClose={this.props.closeFlyout} size="s">
        <EuiFlyoutHeader>
          <EuiTitle size="s">
            <h1>Add layer</h1>
          </EuiTitle>
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
