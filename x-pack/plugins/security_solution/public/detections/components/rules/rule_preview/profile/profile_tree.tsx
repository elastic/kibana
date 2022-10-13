/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { initDataFor } from './init_data';
import { HighlightContextProvider } from './highlight_context';
import type { Index, OnHighlightChangeArgs, ShardSerialized, Targets } from './types';
import { IndexDetails } from './index_details';

interface Props {
  target: Targets;
  data: ShardSerialized[] | null;
  onHighlight: (args: OnHighlightChangeArgs) => void;
  onDataInitError: (error: Error) => void;
}

export const ProfileTree = memo(({ data, target, onHighlight, onDataInitError }: Props) => {
  let content = null;

  if (data && data.length) {
    try {
      const sortedIndices: Index[] = initDataFor()(data);
      content = (
        <HighlightContextProvider onHighlight={onHighlight}>
          <EuiFlexGroup
            className="prfDevTool__profileTree__container"
            gutterSize="none"
            direction="column"
          >
            {sortedIndices.map((index) => (
              <EuiFlexItem key={index.name} grow={false}>
                <EuiFlexGroup
                  className="prfDevTool__profileTree__panel prfDevTool__profileTree__index"
                  gutterSize="none"
                  key={index.name}
                  direction="column"
                >
                  <EuiFlexItem grow={false}>
                    <IndexDetails index={index} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </HighlightContextProvider>
      );
    } catch (e) {
      onDataInitError(e);
    }
  }

  return <div className="prfDevTool__main__profiletree">{content}</div>;
});

ProfileTree.displayName = 'ProfileTree';
