/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';
import { EuiToolTip } from '@elastic/eui';

interface Props {
  isManaged?: boolean;
  tooltipMessage: string;
  component: ReactElement;
}

/**
 * Component that wraps a given component with a tooltip if isManaged is true.
 *
 * @param {boolean} isManaged - Determines if the tooltip should be displayed.
 * @param {string} tooltipMessage - The message to display inside the tooltip.
 * @param {React.ReactElement} component - The component to wrap with the tooltip.
 */
export const DisableToolTip: React.FunctionComponent<Props> = ({
  isManaged,
  tooltipMessage,
  component,
}) => {
  return isManaged ? (
    <EuiToolTip content={tooltipMessage} display="block">
      {component}
    </EuiToolTip>
  ) : (
    component
  );
};
