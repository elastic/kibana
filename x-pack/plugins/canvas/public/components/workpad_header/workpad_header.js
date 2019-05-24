/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Shortcuts } from 'react-shortcuts';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonIcon,
  EuiButton,
  EuiOverlayMask,
  EuiModal,
  EuiModalFooter,
  EuiToolTip,
} from '@elastic/eui';
import { AssetManager } from '../asset_manager';
import { ElementTypes } from '../element_types';
import { ToolTipShortcut } from '../tool_tip_shortcut/';
import { ControlSettings } from './control_settings';
import { RefreshControl } from './refresh_control';
import { FullscreenControl } from './fullscreen_control';
import { WorkpadExport } from './workpad_export';

export class WorkpadHeader extends React.PureComponent {
  static propTypes = {
    isWriteable: PropTypes.bool,
    toggleWriteable: PropTypes.func,
  };

  state = { isModalVisible: false };

  _fullscreenButton = ({ toggleFullscreen }) => (
    <EuiToolTip
      position="bottom"
      content={
        <span>
          Enter fullscreen mode <ToolTipShortcut namespace="PRESENTATION" action="FULLSCREEN" />
        </span>
      }
    >
      <EuiButtonIcon
        iconType="fullScreen"
        aria-label="View fullscreen"
        onClick={toggleFullscreen}
      />
    </EuiToolTip>
  );

  _keyHandler = action => {
    if (action === 'EDITING') {
      this.props.toggleWriteable();
    }
  };

  _hideElementModal = () => this.setState({ isModalVisible: false });
  _showElementModal = () => this.setState({ isModalVisible: true });

  _elementAdd = () => (
    <EuiOverlayMask>
      <EuiModal
        onClose={this._hideElementModal}
        className="canvasModal--fixedSize"
        maxWidth="1000px"
        initialFocus=".canvasElements__filter input"
      >
        <ElementTypes onClose={this._hideElementModal} />
        <EuiModalFooter>
          <EuiButton size="s" onClick={this._hideElementModal}>
            Close
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );

  _getTooltipText = () => {
    if (!this.props.canUserWrite) {
      return "You don't have permission to edit this workpad";
    } else {
      const content = this.props.isWriteable ? `Hide editing controls` : `Show editing controls`;
      return (
        <span>
          {content} <ToolTipShortcut namespace="EDITOR" action="EDITING" />
        </span>
      );
    }
  };

  render() {
    const { isWriteable, canUserWrite, toggleWriteable } = this.props;
    const { isModalVisible } = this.state;

    return (
      <div>
        {isModalVisible ? this._elementAdd() : null}
        <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="xs">
              <EuiFlexItem grow={false}>
                <ControlSettings />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <RefreshControl />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <FullscreenControl>{this._fullscreenButton}</FullscreenControl>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <WorkpadExport />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {canUserWrite && (
                  <Shortcuts
                    name="EDITOR"
                    handler={this._keyHandler}
                    targetNodeSelector="body"
                    global
                  />
                )}
                <EuiToolTip position="bottom" content={this._getTooltipText()}>
                  <EuiButtonIcon
                    iconType={isWriteable ? 'lockOpen' : 'lock'}
                    onClick={toggleWriteable}
                    size="s"
                    aria-label={this._getTooltipText()}
                    isDisabled={!canUserWrite}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {isWriteable ? (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <AssetManager />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    size="s"
                    iconType="vector"
                    data-test-subj="add-element-button"
                    onClick={this._showElementModal}
                  >
                    Add element
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </div>
    );
  }
}
