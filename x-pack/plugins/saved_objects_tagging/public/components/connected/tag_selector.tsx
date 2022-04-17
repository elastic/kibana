/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { TagSelectorComponentProps } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { TagsCapabilities } from '../../../common';
import { TagSelector } from '../base';
import { ITagsCache } from '../../services';
import { CreateModalOpener } from '../edition_modal';

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
