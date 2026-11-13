/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

/** Floating count line over the service map / dashboard panel. Renders nothing when there is no line. */
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
      css={css`
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        z-index: ${euiTheme.levels.content};
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        text-align: center;
        pointer-events: none;
      `}
    >
      <p>{countLine}</p>
    </EuiText>
  );
}
