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
  isWriteable,
  canUserWrite,
  toggleWriteable,
  hasAssets,
  addElement,
  setShowElementModal,
  showElementModal,
  intl,
}) => {
  const keyHandler = action => {
    if (action === 'EDITING') toggleWriteable();
  };

  const elementAdd = (
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
            <FormattedMessage
              id="xpack.canvas.workpadHeader.dismissButtonLabel"
              defaultMessage="Dismiss"
            />
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );

  let readOnlyToolTip = '';

  if (!canUserWrite) {
    readOnlyToolTip = (
      <FormattedMessage
        id="xpack.canvas.workpadHeader.noPermissionToEditWorkpadTooltip"
        defaultMessage="You don't have permission to edit this workpad"
      />
    );
  } else {
    readOnlyToolTip = isWriteable ? (
      <FormattedMessage
        id="xpack.canvas.workpadHeader.editorOpenButtonTooltip"
        defaultMessage="Hide editing controls"
      />
    ) : (
      <FormattedMessage
        id="xpack.canvas.workpadHeader.editorCloseButtonTooltip"
        defaultMessage="Show editing controls"
      />
    );
  }

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
                        id="xpack.canvas.workpadHeader.fullscreenButtonTooltip"
                        defaultMessage="Toggle fullscreen mode"
                      />
                    }
                  >
                    <EuiButtonIcon
                      iconType="fullScreen"
                      aria-label={intl.formatMessage({
                        id: 'xpack.canvas.workpadHeader.fullscreenButtonAriaLabel',
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
              {!canUserWrite && (
                <Shortcuts name="EDITOR" handler={keyHandler} targetNodeSelector="body" global />
              )}
              <EuiToolTip position="bottom" content={readOnlyToolTip}>
                <EuiButtonIcon
                  iconType={isWriteable ? 'lockOpen' : 'lock'}
                  onClick={() => {
                    toggleWriteable();
                  }}
                  size="s"
                  aria-label={readOnlyToolTip}
                  isDisabled={!canUserWrite}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {isWriteable ? (
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
                  <FormattedMessage
                    id="xpack.canvas.workpadHeader.addElementButtonLabel"
                    defaultMessage="Add element"
                  />
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
  isWriteable: PropTypes.bool,
  toggleWriteable: PropTypes.func,
  hasAssets: PropTypes.bool,
  addElement: PropTypes.func.isRequired,
  showElementModal: PropTypes.bool,
  setShowElementModal: PropTypes.func,
};

export const WorkpadHeader = injectI18n(WorkpadHeaderUI);
