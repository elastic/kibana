/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiOverlayMask,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiText,
  EuiButtonIcon,
} from '@elastic/eui';
import { LayerTocActions } from '../../../../../shared/components/layer_toc_actions';
import { i18n } from '@kbn/i18n';

export class TOCEntry extends React.Component {

  state = {
    displayName: null,
    shouldShowModal: false
  };

  componentDidMount() {
    this._isMounted = true;
    this._updateDisplayName();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate() {
    this._updateDisplayName();
  }

  _isLayerDetailsOpen = () => {
    return this.props.openTOCDetails.includes(this.props.layer.getId());
  }

  _toggleLayerDetailsVisibility = () => {
    if (this._isLayerDetailsOpen()) {
      this.props.hideTOCDetails(this.props.layer.getId());
    } else {
      this.props.showTOCDetails(this.props.layer.getId());
    }
  }

  async _updateDisplayName() {
    const label = await this.props.layer.getDisplayName();
    if (this._isMounted) {
      if (label !== this.state.displayName) {
        this.setState({
          displayName: label
        });
      }
    }
  }

  _openLayerPanelWithCheck = () => {
    const selectedLayer = this.props.getSelectedLayerSelector();
    if (selectedLayer && selectedLayer.getId() === this.props.layer.getId()) {
      return;
    }

    if (this.props.hasDirtyStateSelector()) {
      this.setState({
        shouldShowModal: true
      });
      return;
    }

    this.props.openLayerPanel(this.props.layer.getId());
  }

  _renderCancelModal() {
    if (!this.state.shouldShowModal) {
      return null;
    }

    const closeModal = () => {
      this.setState({
        shouldShowModal: false
      });
    };

    const openPanel = () => {
      closeModal();
      this.props.openLayerPanel(this.props.layer.getId());
    };

    return (
      <EuiOverlayMask>
        <EuiModal
          onClose={closeModal}
        >
          <EuiModalBody>
            There are unsaved changes to your layer. Are you sure you want to proceed?
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty
              onClick={closeModal}
            >
              Do not proceed
            </EuiButtonEmpty>

            <EuiButton
              onClick={openPanel}
              fill
            >
              Proceed and discard changes
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      </EuiOverlayMask>
    );
  }

  _renderLayerName() {
    return (
      <EuiText>
        <div
          style={{ maxWidth: '19rem' }}
          className="mapTocEntry__layerName eui-textTruncate eui-textLeft"
          onClick={this._toggleLayerDetailsVisibility}
        >
          {this.state.displayName}
        </div>
        {this._renderLayerIcons()}
      </EuiText>
    );
  }

  _renderLayerIcons() {
    if (this.props.isReadOnly) {
      return null;
    }

    return (
      <span className="mapTocEntry__layerIcons">

        <EuiButtonIcon
          iconType="pencil"
          aria-label={i18n.translate('xpack.maps.layerControl.tocEntry.editButtonAriaLabel', {
            defaultMessage: 'Edit layer'
          })}
          title={i18n.translate('xpack.maps.layerControl.tocEntry.editButtonTitle', {
            defaultMessage: 'Edit layer'
          })}
          onClick={this._openLayerPanelWithCheck}
        />

        <span className="mapTocEntry__grab" {...this.props.dragHandleProps}>
          <EuiIcon type="grab"/>
        </span>

      </span>
    );
  }

  _renderLayerHeader() {
    const {
      cloneLayer,
      isReadOnly,
      layer,
      zoom,
      toggleVisible,
      fitToBounds
    } = this.props;

    return (
      <EuiFlexGroup
        gutterSize="none"
        alignItems="center"
        responsive={false}
        className={
          layer.isVisible() && layer.showAtZoomLevel(zoom)
            && !layer.hasErrors() ? 'mapTocEntry-visible' : 'mapTocEntry-notVisible'
        }
      >
        <EuiFlexItem grow={false}>
          <LayerTocActions
            layer={layer}
            fitToBounds={() => {
              fitToBounds(layer.getId());
            }}
            zoom={zoom}
            toggleVisible={() => {
              toggleVisible(layer.getId());
            }}
            displayName={this.state.displayName}
            cloneLayer={() => {
              cloneLayer(layer.getId());
            }}
            isReadOnly={isReadOnly}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          {this._renderLayerName()}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  _renderLayerDetails = () => {
    if (!this._isLayerDetailsOpen()) {
      return null;
    }

    const tocDetails = this.props.layer.getTOCDetails();
    if (!tocDetails) {
      return null;
    }

    return (
      <Fragment>
        <EuiSpacer size="s"/>
        {tocDetails}
      </Fragment>
    );
  }

  render() {
    return (
      <div
        className="mapTocEntry"
        id={this.props.layer.getId()}
        data-layerid={this.props.layer.getId()}
      >
        {this._renderCancelModal()}

        {this._renderLayerHeader()}

        {this._renderLayerDetails()}
      </div>
    );
  }
}
