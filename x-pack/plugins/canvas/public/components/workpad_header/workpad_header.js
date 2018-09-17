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

export const WorkpadHeader = ({
  isEditing,
  toggleEditing,
  readOnly,
  hasAssets,
  addElement,
  setShowElementModal,
  showElementModal,
}) => {
  const keyHandler = action => {
    if (action === 'EDITING') toggleEditing();
  };

  const elementAdd = (
    <EuiOverlayMask>
      <EuiModal onClose={() => setShowElementModal(false)} className="canvasModal--fixedSize">
        <ElementTypes
          onClick={element => {
            addElement(element);
            setShowElementModal(false);
          }}
        />
        <EuiModalFooter>
          <EuiButton size="s" onClick={() => setShowElementModal(false)}>
            Dismiss
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );

  return (
    <div>
      {showElementModal ? elementAdd : null}
      <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <RefreshControl />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FullscreenControl>
                {({ toggleFullscreen }) => (
                  <EuiToolTip position="bottom" content="Toggle fullscreen mode">
                    <EuiButtonIcon
                      iconType="fullScreen"
                      aria-label="View fullscreen"
                      onClick={toggleFullscreen}
                    />
                  </EuiToolTip>
                )}
              </FullscreenControl>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <WorkpadExport />
            </EuiFlexItem>
            {!readOnly && (
              <EuiFlexItem grow={false}>
                <Shortcuts name="EDITOR" handler={keyHandler} targetNodeSelector="body" global />
                <EuiToolTip
                  position="bottom"
                  content={isEditing ? 'Hide editing controls' : 'Show editing controls'}
                >
                  <EuiButtonIcon
                    iconType={isEditing ? 'eye' : 'eyeClosed'}
                    onClick={() => {
                      toggleEditing();
                    }}
                    size="s"
                    aria-label={isEditing ? 'Hide editing controls' : 'Show editing controls'}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        {isEditing ? (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              {hasAssets && (
                <EuiFlexItem grow={false}>
                  <AssetManager />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  size="s"
                  iconType="vector"
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
};

WorkpadHeader.propTypes = {
  isEditing: PropTypes.bool,
  toggleEditing: PropTypes.func,
  hasAssets: PropTypes.bool,
  addElement: PropTypes.func.isRequired,
  showElementModal: PropTypes.bool,
  setShowElementModal: PropTypes.func,
};
