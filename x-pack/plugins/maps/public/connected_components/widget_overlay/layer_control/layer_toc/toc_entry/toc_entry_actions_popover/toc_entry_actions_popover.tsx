/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';

import { EuiButtonEmpty, EuiPopover, EuiContextMenu, EuiIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ILayer } from '../../../../../../classes/layers/layer';

interface Props {
  cloneLayer: (layerId: string) => void;
  displayName: string;
  editLayer: () => void;
  escapedDisplayName: string;
  fitToBounds: (layerId: string) => void;
  isEditButtonDisabled: boolean;
  isReadOnly: boolean;
  isUsingSearch: boolean;
  layer: ILayer;
  removeLayer: (layerId: string) => void;
  toggleVisible: (layerId: string) => void;
  zoom: number;
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

  _renderPopoverToggleButton() {
    const { icon, tooltipContent, footnotes } = this.props.layer.getIconAndTooltipContent(
      this.props.zoom,
      this.props.isUsingSearch
    );

    const footnoteIcons = footnotes.map((footnote, index) => {
      return (
        <Fragment key={index}>
          {''}
          {footnote.icon}
        </Fragment>
      );
    });
    const footnoteTooltipContent = footnotes.map((footnote, index) => {
      return (
        <div key={index}>
          {footnote.icon} {footnote.message}
        </div>
      );
    });

    return (
      <EuiToolTip
        anchorClassName="mapLayTocActions__tooltipAnchor"
        position="top"
        title={this.props.displayName}
        content={
          <Fragment>
            {tooltipContent}
            {footnoteTooltipContent}
          </Fragment>
        }
      >
        <EuiButtonEmpty
          className="mapTocEntry__layerName eui-textLeft"
          size="xs"
          flush="left"
          color="text"
          onClick={this._togglePopover}
          data-test-subj={`layerTocActionsPanelToggleButton${this.props.escapedDisplayName}`}
        >
          <span className="mapTocEntry__layerNameIcon">{icon}</span>
          {this.props.displayName} {footnoteIcons}
        </EuiButtonEmpty>
      </EuiToolTip>
    );
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
        icon: <EuiIcon type={this.props.layer.isVisible() ? 'eye' : 'eyeClosed'} size="m" />,
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
        id="contextMenu"
        className="mapLayTocActions"
        button={this._renderPopoverToggleButton()}
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        panelPaddingSize="none"
        withTitle
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
