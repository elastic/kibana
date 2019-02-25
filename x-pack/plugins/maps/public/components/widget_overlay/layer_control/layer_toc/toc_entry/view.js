/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
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
} from '@elastic/eui';
import { LayerTocActions } from '../../../../../shared/components/layer_toc_actions';

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

  componentDidUpdate() {
    this._updateDisplayName();
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


  render() {

    const { layer, openLayerPanel, zoom, toggleVisible, fitToBounds } = this.props;
    const legendIcon = (
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
      />
    );
    let tocDetails = layer.getTOCDetails();
    if (tocDetails) {
      tocDetails = (
        <EuiFlexItem>
          <EuiSpacer size="s"/>
          {tocDetails}
        </EuiFlexItem>
      );
    }

    const cancelModal = this._renderCancelModal();

    const openLayerPanelWithCheck = () => {
      const selectedLayer = this.props.getSelectedLayerSelector();
      if (selectedLayer && selectedLayer.getId() === this.props.layer.getId()) {
        return;
      }
      if (this.props.hasDirtyStateSelector()) {
        this.setState({
          shouldShowModal: true
        });
      } else {
        openLayerPanel(layer.getId());
      }
    };

    return (
      <div
        className="mapTocEntry"
        id={layer.getId()}
        data-layerid={layer.getId()}
      >
        {cancelModal}
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
            { legendIcon }
          </EuiFlexItem>
          <EuiFlexItem>
            <button
              onClick={openLayerPanelWithCheck}
              data-test-subj={`mapOpenLayerButton${this.state.displayName
                ? this.state.displayName.replace(' ', '_')
                : ''}`}
            >
              <div style={{ width: 180 }} className="eui-textTruncate eui-textLeft">
                {this.state.displayName}
              </div>
            </button>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <span className="mapTocEntry__grab"><EuiIcon type="grab"/></span>
          </EuiFlexItem>
        </EuiFlexGroup>
        {tocDetails}
      </div>
    );
  }

}
