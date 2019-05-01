/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';

import {
  EuiButtonEmpty,
  EuiPopover,
  EuiContextMenu,
  EuiIcon,
  EuiLoadingSpinner,
  EuiToolTip,
  EuiIconTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export class LayerTocActions extends Component {

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

  _onClick = () => {
    this.setState(prevState => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  _closePopover = () => {
    this.setState(() => ({
      isPopoverOpen: false
    }));
  };

  _renderButton() {
    const icon = this._renderIcon();
    return (
      <EuiButtonEmpty
        className="mapTocEntry__layerName eui-textLeft"
        size="xs"
        flush="left"
        color="text"
        onClick={this._onClick}
        data-test-subj={`layerTocActionsPanelToggleButton${this.props.escapedDisplayName}`}
        // textProps="mapTocEntry__layerNameText"
      >
        <span className="mapTocEntry__layerNameIcon">{icon}</span>
        {this.props.displayName}
      </EuiButtonEmpty>);
  }


  _getVisbilityIcon() {
    const iconType = this.props.layer.isVisible() ? 'eye' : 'eyeClosed';
    return (
      <EuiIcon
        type={iconType}
        size="m"
      />);
  }

  _renderIcon() {
    const { zoom, layer } = this.props;
    let smallLegendIcon;
    if (layer.hasErrors()) {
      smallLegendIcon = (
        <EuiIconTip
          aria-label={i18n.translate('xpack.maps.layerTocActions.loadWarningAriaLabel', { defaultMessage: 'Load warning' })}
          size="m"
          type="alert"
          color="warning"
          content={layer.getErrors()}
        />
      );
    } else if (layer.isLayerLoading()) {
      smallLegendIcon = <EuiLoadingSpinner size="m"/>;
    } else if (!layer.showAtZoomLevel(zoom)) {
      const { minZoom, maxZoom } = layer.getZoomConfig();
      const icon = layer.getIcon();
      smallLegendIcon = (
        <EuiToolTip
          position="top"
          content={
            i18n.translate('xpack.maps.layerTocActions.zoomFeedbackTooltip', {
              defaultMessage: `Map is at zoom level {zoom}.
          This layer is only visible between zoom levels {minZoom} to {maxZoom}.`,
              values: { minZoom, maxZoom, zoom }
            })}
        >
          {icon}
        </EuiToolTip>
      );
    } else {
      smallLegendIcon = layer.getIcon();
    }
    return smallLegendIcon;
  }

  _getPanels() {

    const visibilityToggle = this._getVisbilityIcon();
    const actionItems = [
      {
        name: i18n.translate('xpack.maps.layerTocActions.fitToDataTitle', {
          defaultMessage: 'Fit to data',
        }),
        icon: (
          <EuiIcon
            type="search"
            size="m"
          />
        ),
        'data-test-subj': 'fitToBoundsButton',
        toolTipContent: this.state.supportsFitToBounds ? null : i18n.translate('xpack.maps.layerTocActions.noFitSupportTooltip', {
          defaultMessage: 'Layer does not support fit to data',
        }),
        disabled: !this.state.supportsFitToBounds,
        onClick: () => {
          this._closePopover();
          this.props.fitToBounds();
        },
      },
      {
        name: this.props.layer.isVisible() ? i18n.translate('xpack.maps.layerTocActions.hideLayerTitle', {
          defaultMessage: 'Hide layer',
        }) : i18n.translate('xpack.maps.layerTocActions.showLayerTitle', {
          defaultMessage: 'Show layer',
        }),
        icon: visibilityToggle,
        'data-test-subj': 'layerVisibilityToggleButton',
        onClick: () => {
          this._closePopover();
          this.props.toggleVisible();
        }
      }
    ];

    if (!this.props.isReadOnly) {
      actionItems.push({
        name: i18n.translate('xpack.maps.layerTocActions.editLayerTitle', {
          defaultMessage: 'Edit layer',
        }),
        icon: (
          <EuiIcon
            type="pencil"
            size="m"
          />
        ),
        'data-test-subj': 'editLayerButton',
        onClick: () => {
          this._closePopover();
          this.props.editLayer();
        }
      });
      actionItems.push({
        name: i18n.translate('xpack.maps.layerTocActions.cloneLayerTitle', {
          defaultMessage: 'Clone layer',
        }),
        icon: (
          <EuiIcon
            type="copy"
            size="m"
          />
        ),
        'data-test-subj': 'cloneLayerButton',
        onClick: () => {
          this._closePopover();
          this.props.cloneLayer();
        }
      });
    }

    const actionsPanel = {
      id: 0,
      title: i18n.translate('xpack.maps.layerTocActions.layerActionsTitle', {
        defaultMessage: 'Layer actions',
      }),
      items: actionItems,
    };

    return [actionsPanel];
  }

  render() {
    return (
      <EuiPopover
        id="contextMenu"
        className="mapLayTocActions"
        button={this._renderButton()}
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        panelPaddingSize="none"
        withTitle
        anchorPosition="leftUp"
        anchorClassName="mapLayTocActions__popoverAnchor"
      >
        <EuiContextMenu
          initialPanelId={0}
          panels={this._getPanels()}
          data-test-subj={`layerTocActionsPanel${this.props.escapedDisplayName}`}
        />
      </EuiPopover>);
  }
}
