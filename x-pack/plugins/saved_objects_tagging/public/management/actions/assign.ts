/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { from, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import type { NotificationsStart } from '../../../../../../src/core/public/notifications/notifications_service';
import type { OverlayStart } from '../../../../../../src/core/public/overlays/overlay_service';
import type { ITagsCache } from '../../../../../../src/plugins/saved_objects_tagging_oss/public/api';
import type { TagWithRelations } from '../../../common/types';
import { getAssignFlyoutOpener } from '../../components/assign_flyout/open_assign_flyout';
import type { ITagAssignmentService } from '../../services/assignments/assignment_service';
import type { TagAction } from './types';

interface GetAssignActionOptions {
  overlays: OverlayStart;
  notifications: NotificationsStart;
  tagCache: ITagsCache;
  assignmentService: ITagAssignmentService;
  assignableTypes: string[];
  fetchTags: () => Promise<void>;
  canceled$: Observable<void>;
}

export const getAssignAction = ({
  notifications,
  overlays,
  assignableTypes,
  assignmentService,
  tagCache,
  fetchTags,
  canceled$,
}: GetAssignActionOptions): TagAction => {
  const openFlyout = getAssignFlyoutOpener({
    overlays,
    notifications,
    tagCache,
    assignmentService,
    assignableTypes,
  });

  return {
    id: 'assign',
    name: ({ name }) =>
      i18n.translate('xpack.savedObjectsTagging.management.table.actions.assign.title', {
        defaultMessage: 'Manage {name} assignments',
        values: { name },
      }),
    description: i18n.translate(
      'xpack.savedObjectsTagging.management.table.actions.assign.description',
      {
        defaultMessage: 'Manage assignments',
      }
    ),
    type: 'icon',
    icon: 'tag',
    onClick: async (tag: TagWithRelations) => {
      const flyout = await openFlyout({
        tagIds: [tag.id],
      });

      // close the flyout when the action is canceled
      // this is required when the user navigates away from the page
      canceled$.pipe(takeUntil(from(flyout.onClose))).subscribe(() => {
        flyout.close();
      });

      await flyout.onClose;
      await fetchTags();
    },
    'data-test-subj': 'tagsTableAction-assign',
  };
};
