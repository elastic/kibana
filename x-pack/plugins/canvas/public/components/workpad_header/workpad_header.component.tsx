/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
// @ts-expect-error no @types definition
import { Shortcuts } from 'react-shortcuts';
import { EuiFlexItem, EuiFlexGroup, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { ComponentStrings } from '../../../i18n';
import { ToolTipShortcut } from '../tool_tip_shortcut/';
import { RefreshControl } from './refresh_control';
// @ts-expect-error untyped local
import { FullscreenControl } from './fullscreen_control';
import { ElementMenu } from './element_menu';
import { CommitFn } from '../../../types';
import { TopNavMenu } from '../top_nav_menu';

const { WorkpadHeader: strings } = ComponentStrings;

export interface Props {
  canUserWrite: boolean;
  isWriteable: boolean;
  commit: CommitFn;
  onSetWriteable?: (writeable: boolean) => void;
}

export const WorkpadHeader: FC<Props> = ({
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
    <>
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
      <TopNavMenu commit={commit} />
    </>
  );
};

WorkpadHeader.propTypes = {
  isWriteable: PropTypes.bool,
  commit: PropTypes.func.isRequired,
  onSetWriteable: PropTypes.func,
  canUserWrite: PropTypes.bool,
};
