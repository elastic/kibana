/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { ToolTipShortcut } from '../tool_tip_shortcut/';
import { ComponentStrings } from '../../../i18n/components';
import { ShortcutStrings } from '../../../i18n/shortcuts';

const { SidebarHeader: strings } = ComponentStrings;
const shortcutHelp = ShortcutStrings.getShortcutHelp();

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
}

export const SidebarHeader: FunctionComponent<Props> = ({
  title,
  showLayerControls,
  bringToFront,
  bringForward,
  sendBackward,
  sendToBack,
}) => (
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
    {showLayerControls ? (
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiToolTip
              position="bottom"
              content={
                <span>
                  {shortcutHelp.BRING_TO_FRONT}
                  <ToolTipShortcut namespace="ELEMENT" action="BRING_TO_FRONT" />
                </span>
              }
            >
              <EuiButtonIcon
                color="text"
                iconType="sortUp"
                onClick={bringToFront}
                aria-label={strings.getBringToFrontAriaLabel()}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              position="bottom"
              content={
                <span>
                  {shortcutHelp.BRING_FORWARD}
                  <ToolTipShortcut namespace="ELEMENT" action="BRING_FORWARD" />
                </span>
              }
            >
              <EuiButtonIcon
                color="text"
                iconType="arrowUp"
                onClick={bringForward}
                aria-label={strings.getBringForwardAriaLabel()}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              position="bottom"
              content={
                <span>
                  {shortcutHelp.SEND_BACKWARD}
                  <ToolTipShortcut namespace="ELEMENT" action="SEND_BACKWARD" />
                </span>
              }
            >
              <EuiButtonIcon
                color="text"
                iconType="arrowDown"
                onClick={sendBackward}
                aria-label={strings.getSendBackwardAriaLabel()}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              position="bottom"
              content={
                <span>
                  {shortcutHelp.SEND_TO_BACK}
                  <ToolTipShortcut namespace="ELEMENT" action="SEND_TO_BACK" />
                </span>
              }
            >
              <EuiButtonIcon
                color="text"
                iconType="sortDown"
                onClick={sendToBack}
                aria-label={strings.getSendToBackAriaLabel()}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    ) : null}
  </EuiFlexGroup>
);

SidebarHeader.propTypes = {
  title: PropTypes.string.isRequired,
  showLayerControls: PropTypes.bool, // TODO: remove when we support relayering multiple elements
  bringToFront: PropTypes.func.isRequired,
  bringForward: PropTypes.func.isRequired,
  sendBackward: PropTypes.func.isRequired,
  sendToBack: PropTypes.func.isRequired,
};

SidebarHeader.defaultProps = {
  showLayerControls: false,
};
