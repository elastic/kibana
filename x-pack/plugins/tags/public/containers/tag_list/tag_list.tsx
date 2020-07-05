/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useTags } from '../../context';
import { Tag } from '../tag';

export interface TagListProps {
  kid: string;
  onEditClick?: () => void;
}

export const TagList: React.FC<TagListProps> = React.memo(({ kid, onEditClick }) => {
  const { manager } = useTags();
  const attachments = manager!.useResource(kid);

  return (
    <>
      <EuiFlexGroup wrap responsive={false} gutterSize="xs">
        {attachments.map(({ data }) => (
          <EuiFlexItem key={data.id} grow={false}>
            <Tag key={data.tagId} id={data.tagId} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      {!!onEditClick && (
        <EuiBadge onClick={onEditClick} onClickAriaLabel="Edit tags">
          {'...'}
        </EuiBadge>
      )}
    </>
  );
});
