/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { from } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OverlayStart, NotificationsStart } from 'src/core/public';
import { i18n } from '@kbn/i18n';
import { ITagsCache, ITagAssignmentService } from '../../services';
import { TagBulkAction } from '../types';
import { getAssignFlyoutOpener } from '../../components/assign_flyout';

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
