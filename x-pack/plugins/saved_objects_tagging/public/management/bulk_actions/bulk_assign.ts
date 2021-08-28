/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { from } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import type { NotificationsStart } from '../../../../../../src/core/public/notifications/notifications_service';
import type { OverlayStart } from '../../../../../../src/core/public/overlays/overlay_service';
import type { ITagsCache } from '../../../../../../src/plugins/saved_objects_tagging_oss/public/api';
import { getAssignFlyoutOpener } from '../../components/assign_flyout/open_assign_flyout';
import type { ITagAssignmentService } from '../../services/assignments/assignment_service';
import type { TagBulkAction } from '../types';

interface GetBulkAssignActionOptions {
  overlays: OverlayStart;
  notifications: NotificationsStart;
  tagCache: ITagsCache;
  assignmentService: ITagAssignmentService;
  assignableTypes: string[];
  setLoading: (loading: boolean) => void;
}

export const getBulkAssignAction = ({
  overlays,
  notifications,
  tagCache,
  assignmentService,
  setLoading,
  assignableTypes,
}: GetBulkAssignActionOptions): TagBulkAction => {
  const openFlyout = getAssignFlyoutOpener({
    overlays,
    notifications,
    tagCache,
    assignmentService,
    assignableTypes,
  });

  return {
    id: 'assign',
    label: i18n.translate('xpack.savedObjectsTagging.management.actions.bulkAssign.label', {
      defaultMessage: 'Manage tag assignments',
    }),
    icon: 'tag',
    refreshAfterExecute: true,
    execute: async (tagIds, { canceled$ }) => {
      const flyout = await openFlyout({
        tagIds,
      });

      // close the flyout when the action is canceled
      // this is required when the user navigates away from the page
      canceled$.pipe(takeUntil(from(flyout.onClose))).subscribe(() => {
        flyout.close();
      });

      return flyout.onClose;
    },
  };
};
