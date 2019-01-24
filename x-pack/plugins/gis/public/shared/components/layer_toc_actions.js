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
  EuiIconTip
} from '@elastic/eui';


function flattenPanelTree(tree, array = []) {
  array.push(tree);

  if (tree.items) {
    tree.items.forEach(item => {
      if (item.panel) {
        flattenPanelTree(item.panel, array);
        item.panel = item.panel.id;
      }
    });
  }

  return array;
}

export class LayerTocActions extends Component {


  constructor() {

    super();
    this.state = {
      isPopoverOpen: false
    };

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

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }


  _renderButton() {
    const icon = this._renderIcon();
    return (
      <EuiButtonEmpty
        onClick={this._onClick}
      >{icon}
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
    if (layer.dataHasLoadError()) {
      smallLegendIcon = (
        <EuiIconTip
          aria-label="Load warning"
          size="m"
          type="alert"
          color="warning"
          content={layer.getDataLoadError()}
        />
      );
    } else if (layer.isLayerLoading()) {
      smallLegendIcon = <EuiLoadingSpinner size="m"/>;
    } else if (!layer.showAtZoomLevel(zoom)) {
      const { minZoom, maxZoom } = layer.getZoomConfig();
      const icon = layer.getIcon();
      smallLegendIcon = (
        <EuiToolTip
          position="left"
          content={`Map is at zoom level ${zoom}.
          This layer is only visible between zoom levels ${minZoom} to ${maxZoom}.`}
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
    const panelTree = {
      id: 0,
      title: 'Layer actions',
      items: [
        {
          name: 'Fit to data',
          icon: (
            <EuiIcon
              type="search"
              size="m"
            />
          ),
          onClick: () => {
            this._closePopover();
            this.props.fitToBounds();
          },
        },
        {
          name: 'Change visibility',
          icon: visibilityToggle,
          onClick: () => {
            this._closePopover();
            this.props.toggleVisible();
          }
        }
      ],
    };

    return flattenPanelTree(panelTree);
  }

  render() {
    return (
      <EuiPopover
        id="contextMenu"
        button={this._renderButton()}
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        panelPaddingSize="none"
        withTitle
        anchorPosition="downLeft"
      >
        <EuiContextMenu
          initialPanelId={0}
          panels={this._getPanels()}
        />
      </EuiPopover>);
  }
}
