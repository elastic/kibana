/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';

import { EuiPopover, EuiContextMenu, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ILayer } from '../../../../../../classes/layers/layer';
import { TOCEntryButton } from '../toc_entry_button';

interface Props {
  cloneLayer: (layerId: string) => void;
  displayName: string;
  editLayer: () => void;
  escapedDisplayName: string;
  fitToBounds: (layerId: string) => void;
  isEditButtonDisabled: boolean;
  isReadOnly: boolean;
  layer: ILayer;
  removeLayer: (layerId: string) => void;
  toggleVisible: (layerId: string) => void;
}

interface State {
  isPopoverOpen: boolean;
  supportsFitToBounds: boolean;
}

export class TOCEntryActionsPopover extends Component<Props, State> {
  private _isMounted: boolean = false;

  state = {
    isPopoverOpen: false,
    supportsFitToBounds: false,
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadSupportsFitToBounds();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadSupportsFitToBounds() {
    const supportsFitToBounds = await this.props.layer.supportsFitToBounds();
    if (this._isMounted) {
      this.setState({ supportsFitToBounds });
    }
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
        name: i18n.translate('xpack.maps.layerTocActions.fitToDataTitle', {
          defaultMessage: 'Fit to data',
        }),
        icon: <EuiIcon type="expand" size="m" />,
        'data-test-subj': 'fitToBoundsButton',
        toolTipContent: this.state.supportsFitToBounds
          ? null
          : i18n.translate('xpack.maps.layerTocActions.noFitSupportTooltip', {
              defaultMessage: 'Layer does not support fit to data',
            }),
        disabled: !this.state.supportsFitToBounds,
        onClick: () => {
          this._closePopover();
          this._fitToBounds();
        },
      },
      {
        name: this.props.layer.isVisible()
          ? i18n.translate('xpack.maps.layerTocActions.hideLayerTitle', {
              defaultMessage: 'Hide layer',
            })
          : i18n.translate('xpack.maps.layerTocActions.showLayerTitle', {
              defaultMessage: 'Show layer',
            }),
        icon: <EuiIcon type={this.props.layer.isVisible() ? 'eyeClosed' : 'eye'} size="m" />,
        'data-test-subj': 'layerVisibilityToggleButton',
        toolTipContent: null,
        onClick: () => {
          this._closePopover();
          this._toggleVisible();
        },
      },
    ];

    if (!this.props.isReadOnly) {
      actionItems.push({
        disabled: this.props.isEditButtonDisabled,
        name: i18n.translate('xpack.maps.layerTocActions.editLayerTitle', {
          defaultMessage: 'Edit layer',
        }),
        icon: <EuiIcon type="pencil" size="m" />,
        'data-test-subj': 'editLayerButton',
        toolTipContent: null,
        onClick: () => {
          this._closePopover();
          this.props.editLayer();
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
