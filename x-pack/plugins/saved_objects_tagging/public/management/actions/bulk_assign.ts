/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OverlayStart, NotificationsStart } from 'src/core/public';
import { i18n } from '@kbn/i18n';
import { ITagInternalClient } from '../../tags';
import { TagBulkAction } from '../types';
import { getAssignFlyoutOpener } from '../../components/assign_flyout';

interface GetBulkAssignActionOptions {
  overlays: OverlayStart;
  notifications: NotificationsStart;
  tagClient: ITagInternalClient;
  setLoading: (loading: boolean) => void;
}

export const getBulkAssignAction = ({
  overlays,
  notifications,
  tagClient,
  setLoading,
}: GetBulkAssignActionOptions): TagBulkAction => {
  const openFlyout = getAssignFlyoutOpener({
    overlays,
    tagClient,
  });

  return {
    id: 'assign',
    label: i18n.translate('xpack.savedObjectsTagging.management.actions.bulkAssign.label', {
      defaultMessage: 'Manage tag assignments',
    }),
    icon: 'tag',
    refreshAfterExecute: true,
    execute: async (tagIds) => {
      const flyout = await openFlyout({
        tagIds,
      });
    },
  };
};
