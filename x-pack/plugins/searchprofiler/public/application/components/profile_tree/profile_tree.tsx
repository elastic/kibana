/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { IndexDetails } from './index_details';
import { ShardDetails } from './shard_details';
import { initDataFor } from './init_data';
import { Targets, ShardSerialized, Index } from '../../types';
import { HighlightContextProvider, OnHighlightChangeArgs } from './highlight_context';

export interface Props {
  target: Targets;
  data: ShardSerialized[] | null;
  onHighlight: (args: OnHighlightChangeArgs) => void;
  onDataInitError: (error: Error) => void;
}

export const ProfileTree = memo(({ data, target, onHighlight, onDataInitError }: Props) => {
  if (!data || data.length === 0) {
    return null;
  }

  let sortedIndices: Index[];
  try {
    sortedIndices = initDataFor(target)(data);
  } catch (e) {
    onDataInitError(e);
    return null;
  }

  return (
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
              <EuiSpacer size="s" />
              <EuiFlexItem grow={false}>
                {index.shards.map((shard, idx) => (
                  <Fragment key={shard.id[1] + `_${idx}`}>
                    <ShardDetails index={index} shard={shard} operations={shard[target]!} />
                    {idx < index.shards.length - 1 ? <EuiSpacer size="s" /> : undefined}
                  </Fragment>
                ))}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </HighlightContextProvider>
  );
});
