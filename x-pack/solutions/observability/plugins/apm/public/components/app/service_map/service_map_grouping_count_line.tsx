/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, useEuiTheme } from '@elastic/eui';
import React from 'react';

/** Count line above the service map and the dashboard panel. Renders nothing when there is no line. */
export function ServiceMapGroupingCountLine({ countLine }: { countLine?: string }) {
  const { euiTheme } = useEuiTheme();

  if (!countLine) {
    return null;
  }

  return (
    <EuiText
      size="s"
      color="subdued"
      data-test-subj="serviceMapGroupingCountLine"
      style={{ padding: `${euiTheme.size.s} ${euiTheme.size.m} 0` }}
    >
      <p>{countLine}</p>
    </EuiText>
  );
}
