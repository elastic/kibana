/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiContextMenu, EuiIcon, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ILayer } from '../../../../../../classes/layers/layer';
import { TOCEntryButton } from '../toc_entry_button';
import {
  EDIT_FEATURES_LABEL,
  EDIT_LAYER_SETTINGS_LABEL,
  FIT_TO_DATA_LABEL,
  getVisibilityToggleIcon,
  getVisibilityToggleLabel,
} from '../action_labels';
import { ESSearchSource } from '../../../../../../classes/sources/es_search_source';
import { isVectorLayer, IVectorLayer } from '../../../../../../classes/layers/vector_layer';
import { SCALING_TYPES, VECTOR_SHAPE_TYPE } from '../../../../../../../common/constants';

export interface Props {
  cloneLayer: (layerId: string) => void;
  enableShapeEditing: (layerId: string) => void;
  enablePointEditing: (layerId: string) => void;
  displayName: string;
  openLayerSettings: () => void;
  escapedDisplayName: string;
  fitToBounds: (layerId: string) => void;
  isEditButtonDisabled: boolean;
  isReadOnly: boolean;
  layer: ILayer;
  removeLayer: (layerId: string) => void;
  showThisLayerOnly: (layerId: string) => void;
  supportsFitToBounds: boolean;
  toggleVisible: (layerId: string) => void;
  editModeActiveForLayer: boolean;
  numLayers: number;
}

interface State {
  isPopoverOpen: boolean;
  supportsFeatureEditing: boolean;
  isFeatureEditingEnabled: boolean;
}

export class TOCEntryActionsPopover extends Component<Props, State> {
  state: State = {
    isPopoverOpen: false,
    supportsFeatureEditing: false,
    isFeatureEditingEnabled: false,
  };
  private _isMounted = false;

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate() {
    this._loadFeatureEditing();
  }

  async _loadFeatureEditing() {
    if (!isVectorLayer(this.props.layer)) {
      return;
    }
    const supportsFeatureEditing = (this.props.layer as IVectorLayer).supportsFeatureEditing();
    const isFeatureEditingEnabled = await this._getIsFeatureEditingEnabled();
    if (
      !this._isMounted ||
      (supportsFeatureEditing === this.state.supportsFeatureEditing &&
        isFeatureEditingEnabled === this.state.isFeatureEditingEnabled)
    ) {
      return;
    }
    this.setState({ supportsFeatureEditing, isFeatureEditingEnabled });
  }

  async _getIsFeatureEditingEnabled(): Promise<boolean> {
    const vectorLayer = this.props.layer as IVectorLayer;
    const source = this.props.layer.getSource();
    if (!(source instanceof ESSearchSource)) {
      return false;
    }

    if (
      (source as ESSearchSource).getApplyGlobalQuery() ||
      (source as ESSearchSource).getSyncMeta().scalingType === SCALING_TYPES.CLUSTERS ||
      (await vectorLayer.isFilteredByGlobalTime()) ||
      vectorLayer.isPreviewLayer() ||
      !vectorLayer.isVisible() ||
      vectorLayer.hasJoins()
    ) {
      return false;
    }
    return true;
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
    if (this.props.numLayers > 2) {
      actionItems.push({
        name: i18n.translate('xpack.maps.layerTocActions.showThisLayerOnlyTitle', {
          defaultMessage: 'Show this layer only',
        }),
        icon: <EuiIcon type="eye" size="m" />,
        'data-test-subj': 'showThisLayerOnlyButton',
        toolTipContent: null,
        onClick: () => {
          this._closePopover();
          this.props.showThisLayerOnly(this.props.layer.getId());
        },
      });
    }

    if (!this.props.isReadOnly) {
      actionItems.push({
        disabled: this.props.isEditButtonDisabled,
        name: EDIT_LAYER_SETTINGS_LABEL,
        icon: <EuiIcon type="pencil" size="m" />,
        'data-test-subj': 'layerSettingsButton',
        toolTipContent: null,
        onClick: () => {
          this._closePopover();
          this.props.openLayerSettings();
        },
      });
      if (this.state.supportsFeatureEditing) {
        actionItems.push({
          name: EDIT_FEATURES_LABEL,
          icon: <EuiIcon type="vector" size="m" />,
          'data-test-subj': 'editLayerButton',
          toolTipContent: this.state.isFeatureEditingEnabled
            ? null
            : i18n.translate('xpack.maps.layerTocActions.editFeaturesTooltip.disabledMessage', {
                defaultMessage:
                  'Edit features only supported for document layers without clustering, term joins, time filtering, or global search.',
              }),
          disabled: !this.state.isFeatureEditingEnabled || this.props.editModeActiveForLayer,
          onClick: async () => {
            this._closePopover();
            const supportedShapeTypes = await (
              this.props.layer.getSource() as ESSearchSource
            ).getSupportedShapeTypes();
            const supportsShapes =
              supportedShapeTypes.includes(VECTOR_SHAPE_TYPE.POLYGON) &&
              supportedShapeTypes.includes(VECTOR_SHAPE_TYPE.LINE);
            if (supportsShapes) {
              this.props.enableShapeEditing(this.props.layer.getId());
            } else {
              this.props.enablePointEditing(this.props.layer.getId());
            }
          },
        });
      }
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
