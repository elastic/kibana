/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Tag, TagView } from '../tag/tag';

export interface Props {
  tags: TagView[];
}

export const TagList: React.FC<Props> = React.memo(({ tags }) => {
  return (
    <EuiFlexGroup wrap responsive={false} gutterSize="xs">
      {tags.map((tag) => (
        <EuiFlexItem key={tag.title} grow={false}>
          <Tag tag={tag} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
});
