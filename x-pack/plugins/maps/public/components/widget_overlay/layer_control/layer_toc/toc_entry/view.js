/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import classNames from 'classnames';

import {
  EuiIcon,
  EuiOverlayMask,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
} from '@elastic/eui';
import { LayerTocActions } from '../../../../../shared/components/layer_toc_actions';
import { i18n } from '@kbn/i18n';

function escapeLayerName(name) {
  return name
    ? name.split(' ').join('_')
    : '';
}

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

  _toggleLayerDetailsVisibility = () => {
    if (this.props.isLegendDetailsOpen) {
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
    const { selectedLayer, hasDirtyStateSelector } = this.props;
    if (selectedLayer && selectedLayer.getId() === this.props.layer.getId()) {
      return;
    }

    if (hasDirtyStateSelector) {
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

  _renderLayerIcons() {
    if (this.props.isReadOnly) {
      return null;
    }

    return (
      <div className="mapTocEntry__layerIcons">

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

        <EuiButtonIcon
          iconType="grab"
          color="subdued"
          title={i18n.translate('xpack.maps.layerControl.tocEntry.grabButtonTitle', {
            defaultMessage: 'Reorder layer'
          })}
          aria-label={i18n.translate('xpack.maps.layerControl.tocEntry.grabButtonAriaLabel', {
            defaultMessage: 'Reorder layer'
          })}
          className="mapTocEntry__grab"
          {...this.props.dragHandleProps}
        />

      </div>
    );
  }

  _renderDetailsToggle() {
    if (!this.props.layer.hasLegendDetails()) {
      return null;
    }

    const { isLegendDetailsOpen } = this.props;
    return (
      <span className="mapTocEntry__detailsToggle">
        <button
          className="mapTocEntry__detailsToggleButton"
          aria-label={isLegendDetailsOpen
            ? i18n.translate('xpack.maps.layerControl.tocEntry.hideDetailsButtonAriaLabel', {
              defaultMessage: 'Hide layer details'
            })
            : i18n.translate('xpack.maps.layerControl.tocEntry.showDetailsButtonAriaLabel', {
              defaultMessage: 'Show layer details'
            })
          }
          title={isLegendDetailsOpen
            ? i18n.translate('xpack.maps.layerControl.tocEntry.hideDetailsButtonTitle', {
              defaultMessage: 'Hide layer details'
            })
            : i18n.translate('xpack.maps.layerControl.tocEntry.showDetailsButtonTitle', {
              defaultMessage: 'Show layer details'
            })
          }
          onClick={this._toggleLayerDetailsVisibility}
        >
          <EuiIcon className="eui-alignBaseline" type={isLegendDetailsOpen ? 'arrowUp' : 'arrowDown'} size="s" />
        </button>
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
      <div
        className={
          layer.isVisible() && layer.showAtZoomLevel(zoom)
            && !layer.hasErrors() ? 'mapTocEntry-visible' : 'mapTocEntry-notVisible'
        }
      >
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
          escapedDisplayName={escapeLayerName(this.state.displayName)}
          cloneLayer={() => {
            cloneLayer(layer.getId());
          }}
          editLayer={this._openLayerPanelWithCheck}
          isReadOnly={isReadOnly}
        />

        {this._renderLayerIcons()}
      </div>
    );
  }

  _renderLegendDetails = () => {
    if (!this.props.isLegendDetailsOpen || !this.props.layer.hasLegendDetails()) {
      return null;
    }

    const tocDetails = this.props.layer.getLegendDetails();
    if (!tocDetails) {
      return null;
    }

    return (
      <div
        className="mapTocEntry__layerDetails"
        data-test-subj={`mapLayerTOCDetails${escapeLayerName(this.state.displayName)}`}
      >
        {tocDetails}
      </div>
    );
  }

  render() {
    const classes = classNames(
      'mapTocEntry',
      {
        'mapTocEntry-isDragging': this.props.isDragging,
        'mapTocEntry-isDraggingOver': this.props.isDraggingOver,
      },
    );

    return (
      <div
        className={classes}
        id={this.props.layer.getId()}
        data-layerid={this.props.layer.getId()}
      >
        {this._renderLayerHeader()}

        {this._renderLegendDetails()}

        {this._renderDetailsToggle()}

        {this._renderCancelModal()}
      </div>
    );
  }
}
