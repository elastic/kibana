/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';

interface Props {
  values: string[];
  tooltipLabel?: string;
  numberOfVisibleItems?: number;
}
export function GroupBadges({
  values = [],
  tooltipLabel,
  numberOfVisibleItems = 2,
}: Props) {
  if (values.length < numberOfVisibleItems) {
    return (
      <>
        {values.map((env) => (
          <EuiBadge color="hollow" key={env}>
            {env}
          </EuiBadge>
        ))}
      </>
    );
  }
  return (
    <EuiToolTip
      position="right"
      content={values.map((env) => (
        <React.Fragment key={env}>
          {env}
          <br />
        </React.Fragment>
      ))}
    >
      <EuiBadge>{tooltipLabel}</EuiBadge>
    </EuiToolTip>
  );
}
