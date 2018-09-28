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
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { AssetManager } from '../asset_manager';
import { ElementTypes } from '../element_types';
import { WorkpadExport } from '../workpad_export';
import { FullscreenControl } from '../fullscreen_control';
import { RefreshControl } from '../refresh_control';

const WorkpadHeaderUI = ({
  editing,
  toggleEditing,
  hasAssets,
  addElement,
  setShowElementModal,
  showElementModal,
  intl,
}) => {
  const keyHandler = action => {
    if (action === 'EDITING') toggleEditing();
  };

  const elementAdd = (
    <EuiOverlayMask>
      <EuiModal
        onClose={() => setShowElementModal(false)}
        className="canvasModal--fixedSize"
        maxWidth="1000px"
      >
        <ElementTypes
          onClick={element => {
            addElement(element);
            setShowElementModal(false);
          }}
        />
        <EuiModalFooter>
          <EuiButton size="s" onClick={() => setShowElementModal(false)}>
            <FormattedMessage
              id="xpack.canvas.workpad.header.dismissButtonTitle"
              defaultMessage="Dismiss"
            />
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
                  <EuiToolTip
                    position="bottom"
                    content={
                      <FormattedMessage
                        id="xpack.canvas.workpad.header.fullscreenButtonTooltip"
                        defaultMessage="Toggle fullscreen mode"
                      />
                    }
                  >
                    <EuiButtonIcon
                      iconType="fullScreen"
                      aria-label={intl.formatMessage({
                        id: 'xpack.canvas.workpad.header.fullscreenButtonAriaLabel',
                        defaultMessage: 'View fullscreen',
                      })}
                      onClick={toggleFullscreen}
                    />
                  </EuiToolTip>
                )}
              </FullscreenControl>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <WorkpadExport />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <Shortcuts name="EDITOR" handler={keyHandler} targetNodeSelector="body" global />
              <EuiToolTip
                position="bottom"
                content={
                  editing ? (
                    <FormattedMessage
                      id="xpack.canvas.workpad.header.editorOpenButtonTooltip"
                      defaultMessage="Hide editing controls"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.canvas.workpad.header.editorCloseButtonTooltip"
                      defaultMessage="Show editing controls"
                    />
                  )
                }
              >
                <EuiButtonIcon
                  iconType={editing ? 'eye' : 'eyeClosed'}
                  onClick={() => {
                    toggleEditing();
                  }}
                  size="s"
                  aria-label={
                    editing
                      ? intl.formatMessage({
                          id: 'xpack.canvas.workpad.header.editorOpenButtonAriaLabel',
                          defaultMessage: 'Hide editing controls',
                        })
                      : intl.formatMessage({
                          id: 'xpack.canvas.workpad.header.editorCloseButtonAriaLabel',
                          defaultMessage: 'Show editing controls',
                        })
                  }
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {editing ? (
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

WorkpadHeaderUI.propTypes = {
  editing: PropTypes.bool,
  toggleEditing: PropTypes.func,
  hasAssets: PropTypes.bool,
  addElement: PropTypes.func.isRequired,
  showElementModal: PropTypes.bool,
  setShowElementModal: PropTypes.func,
};

export const WorkpadHeader = injectI18n(WorkpadHeaderUI);
