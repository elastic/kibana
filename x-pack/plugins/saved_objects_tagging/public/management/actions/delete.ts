/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { NotificationsStart, OverlayStart } from '@kbn/core/public';
import { TagWithRelations } from '../../../common';
import { ITagInternalClient } from '../../services/tags';
import { TagAction } from './types';

interface GetDeleteActionOptions {
  overlays: OverlayStart;
  notifications: NotificationsStart;
  tagClient: ITagInternalClient;
  fetchTags: () => Promise<void>;
}

export const getDeleteAction = ({
  notifications,
  overlays,
  tagClient,
  fetchTags,
}: GetDeleteActionOptions): TagAction => {
  return {
    id: 'delete',
    name: ({ name }) =>
      i18n.translate('xpack.savedObjectsTagging.management.table.actions.delete.title', {
        defaultMessage: 'Delete {name} tag',
        values: { name },
      }),
    description: i18n.translate(
      'xpack.savedObjectsTagging.management.table.actions.delete.description',
      {
        defaultMessage: 'Delete this tag',
      }
    ),
    type: 'icon',
    icon: 'trash',
    onClick: async (tag: TagWithRelations) => {
      const confirmed = await overlays.openConfirm(
        i18n.translate('xpack.savedObjectsTagging.modals.confirmDelete.text', {
          defaultMessage:
            'By deleting this tag, you will no longer be able to assign it to saved objects. ' +
            'This tag will be removed from any saved objects that currently use it.',
        }),
        {
          title: i18n.translate('xpack.savedObjectsTagging.modals.confirmDelete.title', {
            defaultMessage: 'Delete "{name}" tag',
            values: {
              name: tag.name,
            },
          }),
          confirmButtonText: i18n.translate(
            'xpack.savedObjectsTagging.modals.confirmDelete.confirmButtonText',
            {
              defaultMessage: 'Delete tag',
            }
          ),
          buttonColor: 'danger',
          maxWidth: 560,
        }
      );
      if (confirmed) {
        await tagClient.delete(tag.id);

        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.savedObjectsTagging.notifications.deleteTagSuccessTitle', {
            defaultMessage: 'Deleted "{name}" tag',
            values: {
              name: tag.name,
            },
          }),
        });

        await fetchTags();
      }
    },
    'data-test-subj': 'tagsTableAction-delete',
  };
};
