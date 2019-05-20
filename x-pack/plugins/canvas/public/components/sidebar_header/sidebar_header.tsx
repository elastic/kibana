/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment, MouseEvent } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonIcon,
  EuiContextMenu,
  EuiToolTip,
  EuiContextMenuPanelItemDescriptor,
  EuiContextMenuPanelDescriptor,
  EuiOverlayMask,
} from '@elastic/eui';
// @ts-ignore unconverted component
import { Popover } from '../popover';
import { CustomElementModal } from '../custom_element_modal';

const topBorderClassName = 'canvasContextMenu--topBorder';

interface Props {
  /**
   * title to display in the header
   */
  title: string;
  /**
   * indicated whether or not layer controls should be displayed
   */
  showLayerControls?: boolean;
  /**
   * cuts selected elements
   */
  cutNodes: () => void;
  /**
   * copies selected elements to clipboard
   */
  copyNodes: () => void;
  /**
   * pastes elements stored in clipboard to page
   */
  pasteNodes: () => void;
  /**
   * clones selected elements
   */
  cloneNodes: () => void;
  /**
   * deletes selected elements
   */
  deleteNodes: () => void;
  /**
   * moves selected element to top layer
   */
  bringToFront: () => void;
  /**
   * moves selected element up one layer
   */
  bringForward: () => void;
  /**
   * moves selected element down one layer
   */
  sendBackward: () => void;
  /**
   * moves selected element to bottom layer
   */
  sendToBack: () => void;
  /**
   * saves the selected elements as an custom-element saved object
   */
  createCustomElement: (name: string, description: string, image: string) => void;
  // TODO: restore when group and ungroup can be triggered outside of workpad_page
  // /**
  //  * indicated whether the selected element is a group or not
  //  */
  // groupIsSelected: boolean,
  // /**
  //  * groups selected elements
  //  */
  // groupNodes: () => void;
  // /**
  //  * ungroups selected group
  //  */
  // ungroupNodes: () => void;
}

interface State {
  /**
   *  indicates whether or not the custom element modal is open
   */
  isModalVisible: boolean;
}

const contextMenuButton = (handleClick: (event: MouseEvent) => void) => (
  <EuiButtonIcon
    color="text"
    iconType="boxesVertical"
    onClick={handleClick}
    aria-label="Element options"
  />
);

export class SidebarHeader extends Component<Props, State> {
  public static propTypes = {
    title: PropTypes.string.isRequired,
    showLayerControls: PropTypes.bool, // TODO: remove when we support relayering multiple elements
    cutNodes: PropTypes.func.isRequired,
    copyNodes: PropTypes.func.isRequired,
    pasteNodes: PropTypes.func.isRequired,
    cloneNodes: PropTypes.func.isRequired,
    deleteNodes: PropTypes.func.isRequired,
    bringToFront: PropTypes.func.isRequired,
    bringForward: PropTypes.func.isRequired,
    sendBackward: PropTypes.func.isRequired,
    sendToBack: PropTypes.func.isRequired,
    createCustomElement: PropTypes.func.isRequired,
    // TODO: restore when group and ungroup can be triggered outside of workpad_page
    // groupIsSelected: PropTypes.bool,
    // groupNodes: PropTypes.func.isRequired,
    // ungroupNodes: PropTypes.func.isRequired,
  };

  public static defaultProps = {
    // TODO: restore when group and ungroup can be triggered outside of workpad_page
    // groupIsSelected: false,
    showLayerControls: false,
  };

  public state = {
    isModalVisible: false,
  };

  private _isMounted = false;
  private _showModal = () => this._isMounted && this.setState({ isModalVisible: true });
  private _hideModal = () => this._isMounted && this.setState({ isModalVisible: false });

  public componentDidMount() {
    this._isMounted = true;
  }

  public componentWillUnmount() {
    this._isMounted = false;
  }
  private _renderLayoutControls = () => {
    const { bringToFront, bringForward, sendBackward, sendToBack } = this.props;
    return (
      <Fragment>
        <EuiFlexItem grow={false}>
          <EuiToolTip position="bottom" content="Move element to top layer">
            <EuiButtonIcon
              color="text"
              iconType="sortUp"
              onClick={bringToFront}
              aria-label="Move element to top layer"
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip position="bottom" content="Move element up one layer">
            <EuiButtonIcon
              color="text"
              iconType="arrowUp"
              onClick={bringForward}
              aria-label="Move element up one layer"
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip position="bottom" content="Move element down one layer">
            <EuiButtonIcon
              color="text"
              iconType="arrowDown"
              onClick={sendBackward}
              aria-label="Move element down one layer"
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip position="bottom" content="Move element to bottom layer">
            <EuiButtonIcon
              color="text"
              iconType="sortDown"
              onClick={sendToBack}
              aria-label="Move element to bottom layer"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </Fragment>
    );
  };

  private _getLayerMenuItems = (): {
    menuItem: EuiContextMenuPanelItemDescriptor;
    panel: EuiContextMenuPanelDescriptor;
  } => {
    const { bringToFront, bringForward, sendBackward, sendToBack } = this.props;

    return {
      menuItem: { name: 'Order', className: topBorderClassName, panel: 1 },
      panel: {
        id: 1,
        title: 'Order',
        items: [
          {
            name: 'Bring to front', // TODO: check against current element position and disable if already top layer
            icon: 'sortUp',
            onClick: bringToFront,
          },
          {
            name: 'Bring forward', // TODO: same as above
            icon: 'arrowUp',
            onClick: bringForward,
          },
          {
            name: 'Send backward', // TODO: check against current element position and disable if already bottom layer
            icon: 'arrowDown',
            onClick: sendBackward,
          },
          {
            name: 'Send to back', // TODO: same as above
            icon: 'sortDown',
            onClick: sendToBack,
          },
        ],
      },
    };
  };

  // TODO: restore when group and ungroup can be triggered outside of workpad_page
  // private _getGroupMenuItem = ():EuiContextMenuPanelItemDescriptor => {
  //   const { groupIsSelected, ungroupNodes, groupNodes } = this.props;
  //   return groupIsSelected
  //     ? {
  //         name: 'Ungroup',
  //         className: topBorderClassName,
  //         onClick: close(ungroupNodes),
  //       }
  //     : {
  //         name: 'Group',
  //         className: topBorderClassName,
  //         onClick: close(groupNodes),
  //       };
  // };

  private _getPanels = (closePopover: () => void): EuiContextMenuPanelDescriptor[] => {
    const {
      showLayerControls,
      cutNodes,
      copyNodes,
      pasteNodes,
      deleteNodes,
      cloneNodes,
    } = this.props;

    // closes popover after invoking fn
    const close = (fn: () => void) => () => {
      fn();
      closePopover();
    };

    const items: EuiContextMenuPanelItemDescriptor[] = [
      {
        name: 'Cut',
        icon: 'cut',
        onClick: close(cutNodes),
      },
      {
        name: 'Copy',
        icon: 'copy',
        onClick: copyNodes,
      },
      {
        name: 'Paste', // TODO: can this be disabled if clipboard is empty?
        icon: 'copyClipboard',
        onClick: close(pasteNodes),
      },
      {
        name: 'Delete',
        icon: 'trash',
        onClick: close(deleteNodes),
      },
      {
        name: 'Clone',
        onClick: close(cloneNodes),
      },
      // TODO: restore when group and ungroup can be triggered outside of workpad_page
      // this._getGroupMenuItem(),
    ];

    const panels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 0,
        title: 'Element options',
        items,
      },
    ];

    if (showLayerControls) {
      const { menuItem, panel } = this._getLayerMenuItems();
      // add Order menu item to first panel
      items.push(menuItem);
      // add nested panel for layers controls
      panels.push(panel);
    }

    items.push({
      name: 'Save as new element',
      icon: 'indexOpen',
      className: topBorderClassName,
      onClick: this._showModal,
    });

    return panels;
  };

  private _renderContextMenu = () => (
    <Popover
      id="sidebar-context-menu-popover"
      className="canvasContextMenu"
      button={contextMenuButton}
      panelPaddingSize="none"
      tooltip="Element options"
      tooltipPosition="bottom"
    >
      {({ closePopover }: { closePopover: () => void }) => (
        <EuiContextMenu initialPanelId={0} panels={this._getPanels(closePopover)} />
      )}
    </Popover>
  );

  private _handleSave = (name: string, description: string, image: string) => {
    const { createCustomElement } = this.props;
    createCustomElement(name, description, image);
    this._hideModal();
  };

  render() {
    const { title, showLayerControls } = this.props;
    const { isModalVisible } = this.state;

    return (
      <Fragment>
        <EuiFlexGroup
          className="canvasLayout__sidebarHeader"
          gutterSize="none"
          alignItems="center"
          justifyContent="spaceBetween"
        >
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>{title}</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="none">
              {showLayerControls ? this._renderLayoutControls() : null}
              <EuiFlexItem grow={false}>
                <EuiToolTip position="bottom" content="Save as new element">
                  <EuiButtonIcon
                    color="text"
                    iconType="indexOpen"
                    onClick={this._showModal}
                    aria-label="Save as new element"
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{this._renderContextMenu()}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        {isModalVisible ? (
          <EuiOverlayMask>
            <CustomElementModal
              title="Create new element"
              onSave={this._handleSave}
              onCancel={this._hideModal}
            />
          </EuiOverlayMask>
        ) : null}
      </Fragment>
    );
  }
}
