/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiPopover, EuiContextMenu, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ILayer } from '../../../../../../classes/layers/layer';
import { TOCEntryButton } from '../toc_entry_button';
import {
  getVisibilityToggleIcon,
  getVisibilityToggleLabel,
  LAYER_SETTINGS_LABEL,
  FIT_TO_DATA_LABEL,
  EDIT_FEATURES_LABEL,
} from '../action_labels';
import { ESSearchSource } from '../../../../../../classes/sources/es_search_source';
import { VectorLayer } from '../../../../../../classes/layers/vector_layer';

export interface Props {
  cloneLayer: (layerId: string) => void;
  enableShapeEditing: (layerId: string) => void;
  enablePointEditing: (layerId: string) => void;
  displayName: string;
  layerSettings: () => void;
  escapedDisplayName: string;
  fitToBounds: (layerId: string) => void;
  isEditButtonDisabled: boolean;
  isReadOnly: boolean;
  layer: ILayer;
  removeLayer: (layerId: string) => void;
  supportsFitToBounds: boolean;
  toggleVisible: (layerId: string) => void;
}

interface State {
  isPopoverOpen: boolean;
  isLayerEditable: boolean;
  editModeEnabled: boolean;
}

export class TOCEntryActionsPopover extends Component<Props, State> {
  state: State = { isPopoverOpen: false, isLayerEditable: false, editModeEnabled: false };
  private _isMounted = false;

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate() {
    this._checkLayerEditable();
  }

  async _checkLayerEditable() {
    if (!(this.props.layer instanceof VectorLayer)) {
      return;
    }
    const isLayerEditable = await this.props.layer.isEditable();
    const editModeEnabled = await this.props.layer.getEditModeEnabled();
    if (
      !this._isMounted ||
      (isLayerEditable === this.state.isLayerEditable &&
        editModeEnabled === this.state.editModeEnabled)
    ) {
      return;
    }
    this.setState({ isLayerEditable, editModeEnabled });
  }

  _togglePopover = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  _closePopover = () => {
    this.setState(() => ({
      isPopoverOpen: false,
    }));
  };

  _cloneLayer() {
    this.props.cloneLayer(this.props.layer.getId());
  }

  _fitToBounds() {
    this.props.fitToBounds(this.props.layer.getId());
  }

  _removeLayer() {
    this.props.removeLayer(this.props.layer.getId());
  }

  _toggleVisible() {
    this.props.toggleVisible(this.props.layer.getId());
  }

  _getActionsPanel() {
    const actionItems = [
      {
        name: FIT_TO_DATA_LABEL,
        icon: <EuiIcon type="expand" size="m" />,
        'data-test-subj': 'fitToBoundsButton',
        toolTipContent: this.props.supportsFitToBounds
          ? null
          : i18n.translate('xpack.maps.layerTocActions.noFitSupportTooltip', {
              defaultMessage: 'Layer does not support fit to data',
            }),
        disabled: !this.props.supportsFitToBounds,
        onClick: () => {
          this._closePopover();
          this._fitToBounds();
        },
      },
      {
        name: getVisibilityToggleLabel(this.props.layer.isVisible()),
        icon: <EuiIcon type={getVisibilityToggleIcon(this.props.layer.isVisible())} size="m" />,
        'data-test-subj': 'layerVisibilityToggleButton',
        toolTipContent: null,
        onClick: () => {
          this._closePopover();
          this._toggleVisible();
        },
      },
    ];

    if (!this.props.isReadOnly) {
      if (this.state.isLayerEditable) {
        actionItems.push({
          name: EDIT_FEATURES_LABEL,
          icon: <EuiIcon type="pencil" size="m" />,
          'data-test-subj': 'editLayerButton',
          toolTipContent: this.state.editModeEnabled
            ? null
            : i18n.translate('xpack.maps.layerTocActions.editLayerTooltip', {
                defaultMessage:
                  'Only fully added document layers without clustering, joins or time filtering enabled can be modified',
              }),
          disabled: !this.state.editModeEnabled,
          onClick: async () => {
            this._closePopover();
            const supportedShapeTypes = await (this.props.layer.getSource() as ESSearchSource).getSupportedShapeTypes();
            if (supportedShapeTypes.length === 1) {
              this.props.enablePointEditing(this.props.layer.getId());
            } else {
              this.props.enableShapeEditing(this.props.layer.getId());
            }
          },
        });
      }
      actionItems.push({
        disabled: this.props.isEditButtonDisabled,
        name: LAYER_SETTINGS_LABEL,
        icon: <EuiIcon type="gear" size="m" />,
        'data-test-subj': 'layerSettingsButton',
        toolTipContent: null,
        onClick: () => {
          this._closePopover();
          this.props.layerSettings();
        },
      });
      actionItems.push({
        name: i18n.translate('xpack.maps.layerTocActions.cloneLayerTitle', {
          defaultMessage: 'Clone layer',
        }),
        icon: <EuiIcon type="copy" size="m" />,
        toolTipContent: null,
        'data-test-subj': 'cloneLayerButton',
        onClick: () => {
          this._closePopover();
          this._cloneLayer();
        },
      });
      actionItems.push({
        name: i18n.translate('xpack.maps.layerTocActions.removeLayerTitle', {
          defaultMessage: 'Remove layer',
        }),
        icon: <EuiIcon type="trash" size="m" />,
        toolTipContent: null,
        'data-test-subj': 'removeLayerButton',
        onClick: () => {
          this._closePopover();
          this._removeLayer();
        },
      });
    }

    return {
      id: 0,
      title: i18n.translate('xpack.maps.layerTocActions.layerActionsTitle', {
        defaultMessage: 'Layer actions',
      }),
      items: actionItems,
    };
  }

  render() {
    return (
      <EuiPopover
        id={this.props.layer.getId()}
        className="mapLayTocActions"
        button={
          <TOCEntryButton
            layer={this.props.layer}
            displayName={this.props.displayName}
            escapedDisplayName={this.props.escapedDisplayName}
            onClick={this._togglePopover}
          />
        }
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        panelPaddingSize="none"
        anchorPosition="leftUp"
        anchorClassName="mapLayTocActions__popoverAnchor"
      >
        <EuiContextMenu
          initialPanelId={0}
          panels={[this._getActionsPanel()]}
          data-test-subj={`layerTocActionsPanel${this.props.escapedDisplayName}`}
        />
      </EuiPopover>
    );
  }
}
