/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import type { FC } from 'react';
import React, { useMemo } from 'react';
import type { ITagsCache } from '../../../../../../../src/plugins/saved_objects_tagging_oss/public/api';
import { TagList } from '../../base/tag_list';

export interface AssignFlyoutHeaderProps {
  tagIds: string[];
  tagCache: ITagsCache;
}

export const AssignFlyoutHeader: FC<AssignFlyoutHeaderProps> = ({ tagCache, tagIds }) => {
  const tags = useMemo(() => {
    return tagCache.getState().filter((tag) => tagIds.includes(tag.id));
  }, [tagCache, tagIds]);

  return (
    <>
      <EuiTitle size="m">
        <h3>
          <FormattedMessage
            id="xpack.savedObjectsTagging.assignFlyout.title"
            defaultMessage="Manage tag assignments"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <TagList tags={tags} />
    </>
  );
};
