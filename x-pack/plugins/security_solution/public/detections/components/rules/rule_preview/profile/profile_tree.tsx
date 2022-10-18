/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { initDataFor } from './init_data';
import type { Index, ShardSerialized } from './types';
import { IndexDetails } from './index_details';

interface Props {
  data: ShardSerialized[] | null;
}

export const ProfileTree = memo(({ data }: Props) => {
  let content = null;

  if (data && data.length) {
    const sortedIndices: Index[] = initDataFor()(data);
    content = (
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
    );
  }

  return <div className="prfDevTool__main__profiletree">{content}</div>;
});

ProfileTree.displayName = 'ProfileTree';
