/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { MouseEventHandler } from 'react';
import PropTypes from 'prop-types';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { ToolTipShortcut } from '../../tool_tip_shortcut';

import { ComponentStrings } from '../../../../i18n';
const { WorkpadHeaderRefreshControlSettings: strings } = ComponentStrings;

interface Props {
  doRefresh: MouseEventHandler<HTMLButtonElement>;
  inFlight: boolean;
}

export const RefreshControl = ({ doRefresh, inFlight }: Props) => (
  <EuiToolTip
    position="bottom"
    content={
      <span>
        {strings.getRefreshTooltip()}
        <ToolTipShortcut namespace="EDITOR" action="REFRESH" />
      </span>
    }
  >
    <EuiButtonIcon
      disabled={inFlight}
      iconType="refresh"
      aria-label={strings.getRefreshAriaLabel()}
      onClick={doRefresh}
      data-test-subj="canvas-refresh-control"
    />
  </EuiToolTip>
);

RefreshControl.propTypes = {
  doRefresh: PropTypes.func.isRequired,
  inFlight: PropTypes.bool,
};
