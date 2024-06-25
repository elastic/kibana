/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { TagsCapabilities } from '../../../common';
import { ITagInternalClient, ITagAssignmentService, ITagsCache } from '../../services';
import { StartServices } from '../../types';
import { TagAction } from './types';
import { getDeleteAction } from './delete';
import { getEditAction } from './edit';
import { getAssignAction } from './assign';

export type { TagAction } from './types';

interface GetActionsOptions {
  startServices: StartServices;
  capabilities: TagsCapabilities;
  tagClient: ITagInternalClient;
  tagCache: ITagsCache;
  assignmentService: ITagAssignmentService;
  setLoading: (loading: boolean) => void;
  assignableTypes: string[];
  fetchTags: () => Promise<void>;
  canceled$: Observable<void>;
}

export const getTableActions = ({
  startServices,
  capabilities,
  tagClient,
  tagCache,
  assignmentService,
  assignableTypes,
  fetchTags,
  canceled$,
}: GetActionsOptions): TagAction[] => {
  const actions: TagAction[] = [];

  if (capabilities.edit) {
    actions.push(getEditAction({ ...startServices, tagClient, fetchTags }));
  }

  if (capabilities.assign && assignableTypes.length > 0) {
    actions.push(
      getAssignAction({
        ...startServices,
        tagCache,
        assignmentService,
        assignableTypes,
        fetchTags,
        canceled$,
      })
    );
  }

  if (capabilities.delete) {
    actions.push(getDeleteAction({ ...startServices, tagClient, fetchTags }));
  }

  return actions;
};
