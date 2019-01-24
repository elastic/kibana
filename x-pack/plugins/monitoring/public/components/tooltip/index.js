/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';

export const Tooltip = props => {
  return (
    <EuiToolTip
      content={props.text}
      position={props.placement}
    >
      <span className="overlay-trigger">
        <span className="monitoring-tooltip__trigger">
          { props.children}
        </span>
      </span>
    </EuiToolTip>
  );
};

Tooltip.defaultProps = {
  placement: 'top',
  trigger: 'click'
};
