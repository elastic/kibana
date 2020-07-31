/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import classNames from 'classnames';

import { EuiIcon, EuiOverlayMask, EuiButtonIcon, EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { TOCEntryActionsPopover } from './toc_entry_actions_popover';
import { ILayer } from '../../../../../classes/layers/layer';

function escapeLayerName(name: string | null) {
  return name ? name.split(' ').join('_') : '';
}

export enum MODAL_ACTION {
  OPEN_LAYER_PANEL = 'OPEN_LAYER_PANEL',
  CLONE_LAYER_PANEL = 'CLONE_LAYER_PANEL',
}

interface Props {
  layer: ILayer;
  dragHandleProps: unknown;
  isDragging: boolean;
  isDraggingOver: boolean;
  isReadOnly: boolean;
  zoom: number;
  selectedLayer?: ILayer;
  hasDirtyState: boolean;
  isLegendDetailsOpen: boolean;
  areOpenPanelButtonsDisabled: boolean;
  openLayerPanel: (layerId: string) => void;
  cloneLayer: (layerId: string) => void;
  hideTOCDetails: (layerId: string) => void;
  showTOCDetails: (layerId: string) => void;
}

interface State {
  displayName: string | null;
  hasLegendDetails: boolean;
  showModal: boolean;
  modalAction: MODAL_ACTION | null;
}

export class TOCEntry extends Component<Props, State> {
  private _isMounted: boolean = false;

  state: State = {
    displayName: null,
    hasLegendDetails: false,
    showModal: false,
    modalAction: null,
  };

  componentDidMount() {
    this._isMounted = true;
    this._updateDisplayName();
    this._loadHasLegendDetails();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate() {
    this._updateDisplayName();
    this._loadHasLegendDetails();
  }

  _toggleLayerDetailsVisibility = () => {
    if (this.props.isLegendDetailsOpen) {
      this.props.hideTOCDetails(this.props.layer.getId());
    } else {
      this.props.showTOCDetails(this.props.layer.getId());
    }
  };

  async _loadHasLegendDetails() {
    const hasLegendDetails =
      (await this.props.layer.hasLegendDetails()) &&
      this.props.layer.isVisible() &&
      this.props.layer.showAtZoomLevel(this.props.zoom);
    if (this._isMounted && hasLegendDetails !== this.state.hasLegendDetails) {
      this.setState({ hasLegendDetails });
    }
  }

  async _updateDisplayName() {
    const label = await this.props.layer.getDisplayName();
    if (this._isMounted) {
      if (label !== this.state.displayName) {
        this.setState({
          displayName: label,
        });
      }
    }
  }

  _openLayerPanelWithDirtyCheck = () => {
    if (this.props.selectedLayer && this.props.selectedLayer.getId() === this.props.layer.getId()) {
      return;
    }

    if (this.props.hasDirtyState) {
      this.setState({
        showModal: true,
        modalAction: MODAL_ACTION.OPEN_LAYER_PANEL,
      });
      return;
    }

    this.props.openLayerPanel(this.props.layer.getId());
  };

  _cloneLayerWithDirtyCheck = () => {
    if (this.props.hasDirtyState) {
      this.setState({
        showModal: true,
        modalAction: MODAL_ACTION.CLONE_LAYER_PANEL,
      });
      return;
    }

    this.props.cloneLayer(this.props.layer.getId());
  };

  _renderCancelModal() {
    if (!this.state.showModal) {
      return null;
    }

    const closeModal = () => {
      this.setState({
        showModal: false,
        modalAction: null,
      });
    };

    const openPanel = () => {
      if (this.state.modalAction === MODAL_ACTION.OPEN_LAYER_PANEL) {
        this.props.openLayerPanel(this.props.layer.getId());
      } else if (this.state.modalAction === MODAL_ACTION.CLONE_LAYER_PANEL) {
        this.props.cloneLayer(this.props.layer.getId());
      }
      closeModal();
    };

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={i18n.translate('xpack.maps.layerControl.tocEntry.modalTitle', {
            defaultMessage: 'Discard changes',
          })}
          onCancel={closeModal}
          onConfirm={openPanel}
          cancelButtonText={i18n.translate('xpack.maps.layerControl.tocEntry.modalCancelTitle', {
            defaultMessage: 'Do not proceed',
          })}
          confirmButtonText={i18n.translate('xpack.maps.layerControl.tocEntry.modalConfirmTitle', {
            defaultMessage: 'Proceed and discard changes',
          })}
          buttonColor="danger"
          defaultFocusedButton="cancel"
        >
          <p>
            <FormattedMessage
              id="xpack.maps.layerControl.tocEntry.modelTextP1"
              defaultMessage="Your layer has unsaved changes."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.maps.layerControl.tocEntry.modelTextP2"
              defaultMessage="Are you sure you want to proceed?"
            />
          </p>
        </EuiConfirmModal>
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
          isDisabled={this.props.areOpenPanelButtonsDisabled}
          iconType="pencil"
          aria-label={i18n.translate('xpack.maps.layerControl.tocEntry.editButtonAriaLabel', {
            defaultMessage: 'Edit layer',
          })}
          title={i18n.translate('xpack.maps.layerControl.tocEntry.editButtonTitle', {
            defaultMessage: 'Edit layer',
          })}
          onClick={this._openLayerPanelWithDirtyCheck}
        />

        <EuiButtonIcon
          iconType="grab"
          color="subdued"
          title={i18n.translate('xpack.maps.layerControl.tocEntry.grabButtonTitle', {
            defaultMessage: 'Reorder layer',
          })}
          aria-label={i18n.translate('xpack.maps.layerControl.tocEntry.grabButtonAriaLabel', {
            defaultMessage: 'Reorder layer',
          })}
          className="mapTocEntry__grab"
          {...this.props.dragHandleProps}
        />
      </div>
    );
  }

  _renderDetailsToggle() {
    if (!this.state.hasLegendDetails) {
      return null;
    }

    const { isLegendDetailsOpen } = this.props;
    return (
      <span className="mapTocEntry__detailsToggle">
        <button
          className="mapTocEntry__detailsToggleButton"
          aria-label={
            isLegendDetailsOpen
              ? i18n.translate('xpack.maps.layerControl.tocEntry.hideDetailsButtonAriaLabel', {
                  defaultMessage: 'Hide layer details',
                })
              : i18n.translate('xpack.maps.layerControl.tocEntry.showDetailsButtonAriaLabel', {
                  defaultMessage: 'Show layer details',
                })
          }
          title={
            isLegendDetailsOpen
              ? i18n.translate('xpack.maps.layerControl.tocEntry.hideDetailsButtonTitle', {
                  defaultMessage: 'Hide layer details',
                })
              : i18n.translate('xpack.maps.layerControl.tocEntry.showDetailsButtonTitle', {
                  defaultMessage: 'Show layer details',
                })
          }
          onClick={this._toggleLayerDetailsVisibility}
        >
          <EuiIcon
            className="eui-alignBaseline"
            type={isLegendDetailsOpen ? 'arrowUp' : 'arrowDown'}
            size="s"
          />
        </button>
      </span>
    );
  }

  _renderLayerHeader() {
    const { layer, zoom } = this.props;
    return (
      <div
        className={
          layer.isVisible() && layer.showAtZoomLevel(zoom) && !layer.hasErrors()
            ? 'mapTocEntry-visible'
            : 'mapTocEntry-notVisible'
        }
      >
        <TOCEntryActionsPopover
          layer={layer}
          displayName={this.state.displayName}
          escapedDisplayName={escapeLayerName(this.state.displayName)}
          editLayer={this._openLayerPanelWithDirtyCheck}
          cloneLayer={this._cloneLayerWithDirtyCheck}
          areOpenPanelButtonsDisabled={this.props.areOpenPanelButtonsDisabled}
        />

        {this._renderLayerIcons()}
      </div>
    );
  }

  _renderLegendDetails = () => {
    if (!this.props.isLegendDetailsOpen || !this.state.hasLegendDetails) {
      return null;
    }

    const tocDetails = this.props.layer.renderLegendDetails();
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
  };

  render() {
    const classes = classNames('mapTocEntry', {
      'mapTocEntry-isDragging': this.props.isDragging,
      'mapTocEntry-isDraggingOver': this.props.isDraggingOver,
      'mapTocEntry-isSelected':
        this.props.layer.isPreviewLayer() ||
        (this.props.selectedLayer && this.props.selectedLayer.getId() === this.props.layer.getId()),
    });

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
