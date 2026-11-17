/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { Panel } from '@xyflow/react';
import React from 'react';

/** ReactFlow overlay with the grouping count line. Renders nothing when there is no line. */
export function ServiceMapGroupingCountLine({ countLine }: { countLine?: string }) {
  if (!countLine) {
    return null;
  }

  return (
    <Panel
      position="bottom-left"
      css={css`
        pointer-events: none;
      `}
    >
      <EuiText size="s" color="subdued" data-test-subj="serviceMapGroupingCountLine">
        <p>{countLine}</p>
      </EuiText>
    </Panel>
  );
}
