/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import type {
  ITagsCache,
  TagSelectorComponentProps,
} from '../../../../../../src/plugins/saved_objects_tagging_oss/public/api';
import type { TagsCapabilities } from '../../../common/capabilities';
import { TagSelector } from '../base/tag_selector';
import type { CreateModalOpener } from '../edition_modal/open_modal';

interface GetConnectedTagSelectorOptions {
  cache: ITagsCache;
  capabilities: TagsCapabilities;
  openCreateModal: CreateModalOpener;
}

export const getConnectedTagSelectorComponent = ({
  cache,
  capabilities,
  openCreateModal,
}: GetConnectedTagSelectorOptions): FC<TagSelectorComponentProps> => {
  return (props: TagSelectorComponentProps) => {
    const tags = useObservable(cache.getState$(), cache.getState());
    return (
      <TagSelector
        {...props}
        tags={tags}
        allowCreate={capabilities.create}
        openCreateModal={openCreateModal}
      />
    );
  };
};
