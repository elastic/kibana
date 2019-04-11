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
  EuiLink,
  EuiText,
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
    const displayName = (
      <div style={{ width: 180 }} className="eui-textTruncate eui-textLeft">
        {this.state.displayName}
      </div>
    );

    if (this.props.isReadOnly) {
      return (
        <EuiText>
          {displayName}
        </EuiText>
      );
    }

    return (
      <EuiLink
        color="text"
        onClick={this._openLayerPanelWithCheck}
        data-test-subj={
          `mapOpenLayerButton${this.state.displayName
            ? this.state.displayName.replace(' ', '_')
            : ''}`
        }
      >
        {displayName}
      </EuiLink>
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

    let sortIcon;
    if (!isReadOnly) {
      sortIcon = (
        <EuiFlexItem grow={false}>
          <span className="mapTocEntry__grab" {...this.props.dragHandleProps}>
            <EuiIcon type="grab"/>
          </span>
        </EuiFlexItem>
      );
    }

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
            isReadOnly={this.props.isReadOnly}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          {this._renderLayerName()}
        </EuiFlexItem>
        {sortIcon}
      </EuiFlexGroup>
    );
  }

  _renderLayerDetails() {
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
