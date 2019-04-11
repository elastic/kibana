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
import { WorkpadExport } from '../workpad_export';
import { FullscreenControl } from '../fullscreen_control';
import { RefreshControl } from '../refresh_control';

export class WorkpadHeader extends React.PureComponent {
  static propTypes = {
    isWriteable: PropTypes.bool,
    toggleWriteable: PropTypes.func,
    addElement: PropTypes.func.isRequired,
    showElementModal: PropTypes.bool,
    setShowElementModal: PropTypes.func,
  };

  fullscreenButton = ({ toggleFullscreen }) => (
    <EuiToolTip position="bottom" content="Enter fullscreen mode">
      <EuiButtonIcon
        iconType="fullScreen"
        aria-label="View fullscreen"
        onClick={toggleFullscreen}
      />
    </EuiToolTip>
  );

  keyHandler = action => {
    if (action === 'EDITING') {
      this.props.toggleWriteable();
    }
  };

  elementAdd = () => {
    const { addElement, setShowElementModal } = this.props;

    return (
      <EuiOverlayMask>
        <EuiModal
          onClose={() => setShowElementModal(false)}
          className="canvasModal--fixedSize"
          maxWidth="1000px"
          initialFocus=".canvasElements__filter"
        >
          <ElementTypes
            onClick={element => {
              addElement(element);
              setShowElementModal(false);
            }}
          />
          <EuiModalFooter>
            <EuiButton size="s" onClick={() => setShowElementModal(false)}>
              Close
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      </EuiOverlayMask>
    );
  };

  getTooltipText = () => {
    if (!this.props.canUserWrite) {
      return "You don't have permission to edit this workpad";
    } else {
      return this.props.isWriteable ? 'Hide editing controls' : 'Show editing controls';
    }
  };

  render() {
    const {
      isWriteable,
      canUserWrite,
      toggleWriteable,
      setShowElementModal,
      showElementModal,
    } = this.props;

    return (
      <div>
        {showElementModal ? this.elementAdd() : null}
        <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="xs">
              <EuiFlexItem grow={false}>
                <RefreshControl />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <FullscreenControl>{this.fullscreenButton}</FullscreenControl>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <WorkpadExport />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {canUserWrite && (
                  <Shortcuts
                    name="EDITOR"
                    handler={this.keyHandler}
                    targetNodeSelector="body"
                    global
                  />
                )}
                <EuiToolTip position="bottom" content={this.getTooltipText()}>
                  <EuiButtonIcon
                    iconType={isWriteable ? 'lockOpen' : 'lock'}
                    onClick={() => {
                      toggleWriteable();
                    }}
                    size="s"
                    aria-label={this.getTooltipText()}
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
                    onClick={() => setShowElementModal(true)}
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
