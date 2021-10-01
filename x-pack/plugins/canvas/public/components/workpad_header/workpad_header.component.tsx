/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import PropTypes from 'prop-types';
// @ts-expect-error no @types definition
import { Shortcuts } from 'react-shortcuts';
import { EuiFlexItem, EuiFlexGroup, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ToolTipShortcut } from '../tool_tip_shortcut/';
import { RefreshControl } from './refresh_control';
// @ts-expect-error untyped local
import { FullscreenControl } from './fullscreen_control';
import { EditMenu } from './edit_menu';
import { ElementMenu } from './element_menu';
import { ShareMenu } from './share_menu';
import { ViewMenu } from './view_menu';
import { LabsControl } from './labs_control';
import { CommitFn } from '../../../types';

const strings = {
  getFullScreenButtonAriaLabel: () =>
    i18n.translate('xpack.canvas.workpadHeader.fullscreenButtonAriaLabel', {
      defaultMessage: 'View fullscreen',
    }),
  getFullScreenTooltip: () =>
    i18n.translate('xpack.canvas.workpadHeader.fullscreenTooltip', {
      defaultMessage: 'Enter fullscreen mode',
    }),
  getHideEditControlTooltip: () =>
    i18n.translate('xpack.canvas.workpadHeader.hideEditControlTooltip', {
      defaultMessage: 'Hide editing controls',
    }),
  getNoWritePermissionTooltipText: () =>
    i18n.translate('xpack.canvas.workpadHeader.noWritePermissionTooltip', {
      defaultMessage: "You don't have permission to edit this workpad",
    }),
  getShowEditControlTooltip: () =>
    i18n.translate('xpack.canvas.workpadHeader.showEditControlTooltip', {
      defaultMessage: 'Show editing controls',
    }),
};

export interface Props {
  isWriteable: boolean;
  canUserWrite: boolean;
  commit: CommitFn;
  onSetWriteable?: (writeable: boolean) => void;
}

export const WorkpadHeader: FunctionComponent<Props> = ({
  isWriteable,
  canUserWrite,
  commit,
  onSetWriteable = () => {},
}) => {
  const toggleWriteable = () => onSetWriteable(!isWriteable);

  const keyHandler = (action: string) => {
    if (action === 'EDITING') {
      toggleWriteable();
    }
  };

  const fullscreenButton = ({ toggleFullscreen }: { toggleFullscreen: () => void }) => (
    <EuiToolTip
      position="bottom"
      content={
        <span>
          {strings.getFullScreenTooltip()}{' '}
          <ToolTipShortcut namespace="PRESENTATION" action="FULLSCREEN" />
        </span>
      }
    >
      <EuiButtonIcon
        iconType="fullScreen"
        aria-label={strings.getFullScreenButtonAriaLabel()}
        onClick={toggleFullscreen}
      />
    </EuiToolTip>
  );

  const getEditToggleToolTipText = () => {
    if (!canUserWrite) {
      return strings.getNoWritePermissionTooltipText();
    }

    const content = isWriteable
      ? strings.getHideEditControlTooltip()
      : strings.getShowEditControlTooltip();

    return content;
  };

  const getEditToggleToolTip = ({ textOnly } = { textOnly: false }) => {
    const content = getEditToggleToolTipText();

    if (textOnly) {
      return content;
    }

    return (
      <span>
        {content} <ToolTipShortcut namespace="EDITOR" action="EDITING" />
      </span>
    );
  };

  return (
    <EuiFlexGroup
      gutterSize="none"
      alignItems="center"
      justifyContent="spaceBetween"
      className="canvasLayout__stageHeaderInner"
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="none">
          {isWriteable && (
            <EuiFlexItem grow={false}>
              <ElementMenu />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <ViewMenu />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EditMenu commit={commit} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ShareMenu />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <LabsControl />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            {canUserWrite && (
              <Shortcuts
                name="EDITOR"
                handler={keyHandler}
                targetNodeSelector="body"
                global
                isolate
              />
            )}
            <EuiToolTip position="bottom" content={getEditToggleToolTip()}>
              <EuiButtonIcon
                iconType={isWriteable ? 'eyeClosed' : 'eye'}
                onClick={toggleWriteable}
                size="s"
                aria-label={getEditToggleToolTipText()}
                isDisabled={!canUserWrite}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <RefreshControl />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <FullscreenControl>{fullscreenButton}</FullscreenControl>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

WorkpadHeader.propTypes = {
  isWriteable: PropTypes.bool,
  commit: PropTypes.func.isRequired,
  onSetWriteable: PropTypes.func,
  canUserWrite: PropTypes.bool,
};
