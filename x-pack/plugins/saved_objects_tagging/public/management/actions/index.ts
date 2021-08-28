/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Observable } from 'rxjs';
import type { CoreStart } from '../../../../../../src/core/public/types';
import type { ITagsCache } from '../../../../../../src/plugins/saved_objects_tagging_oss/public/api';
import type { TagsCapabilities } from '../../../common/capabilities';
import type { ITagAssignmentService } from '../../services/assignments/assignment_service';
import type { ITagInternalClient } from '../../services/tags/tags_client';
import { getAssignAction } from './assign';
import { getDeleteAction } from './delete';
import { getEditAction } from './edit';
import type { TagAction } from './types';

export { TagAction } from './types';

interface GetActionsOptions {
  core: CoreStart;
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
  core: { notifications, overlays },
  capabilities,
  tagClient,
  tagCache,
  assignmentService,
  setLoading,
  assignableTypes,
  fetchTags,
  canceled$,
}: GetActionsOptions): TagAction[] => {
  const actions: TagAction[] = [];

  if (capabilities.edit) {
    actions.push(getEditAction({ notifications, overlays, tagClient, fetchTags }));
  }

  if (capabilities.assign && assignableTypes.length > 0) {
    actions.push(
      getAssignAction({
        tagCache,
        assignmentService,
        assignableTypes,
        fetchTags,
        notifications,
        overlays,
        canceled$,
      })
    );
  }

  if (capabilities.delete) {
    actions.push(getDeleteAction({ overlays, notifications, tagClient, fetchTags }));
  }

  return actions;
};
