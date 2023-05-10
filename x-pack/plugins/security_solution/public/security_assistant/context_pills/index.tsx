/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';

import { sortBy } from 'lodash/fp';
import React, { useMemo } from 'react';

import type { PromptContext } from '../prompt_context/types';

interface Props {
  promptContexts: Record<string, PromptContext>;
}

const ContextPillsComponent: React.FC<Props> = ({ promptContexts }) => {
  const sortedPromptContexts = useMemo(
    () => sortBy('description', Object.values(promptContexts)),
    [promptContexts]
  );

  return (
    <EuiFlexGroup gutterSize="none">
      {sortedPromptContexts.map(({ description, id, getPromptContext, tooltip }) => (
        <EuiFlexItem grow={false} key={id}>
          <EuiToolTip content={tooltip}>
            <EuiButton onClick={async () => alert(await getPromptContext())}>
              {description}
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

export const ContextPills = React.memo(ContextPillsComponent);
