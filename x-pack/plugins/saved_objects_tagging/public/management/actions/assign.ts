/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action as EuiTableAction } from '@elastic/eui/src/components/basic_table/action_types';
import { i18n } from '@kbn/i18n';
import { NotificationsStart, OverlayStart } from 'kibana/public';
import { TagWithRelations } from '../../../common';
import { ITagsCache } from '../../services/tags';
import { getAssignFlyoutOpener } from '../../components/assign_flyout';
import { ITagAssignmentService } from '../../services/assignments';

interface GetAssignActionOptions {
  overlays: OverlayStart;
  notifications: NotificationsStart;
  tagCache: ITagsCache;
  assignmentService: ITagAssignmentService;
  assignableTypes: string[];
  fetchTags: () => Promise<void>;
}

export const getAssignAction = ({
  notifications,
  overlays,
  assignableTypes,
  assignmentService,
  tagCache,
  fetchTags,
}: GetAssignActionOptions): EuiTableAction<TagWithRelations> => {
  const openFlyout = getAssignFlyoutOpener({
    overlays,
    notifications,
    tagCache,
    assignmentService,
    assignableTypes,
  });

  return {
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

      // TODO
      /*
      canceled$.pipe(takeUntil(from(flyout.onClose))).subscribe(() => {
        flyout.close();
      });
      */

      await flyout.onClose;
      await fetchTags();
    },
    'data-test-subj': 'tagsTableAction-assign',
  };
};
