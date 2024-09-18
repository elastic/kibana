/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Observable, from, takeUntil } from 'rxjs';
import { TagWithRelations } from '../../../common';
import { getAssignFlyoutOpener } from '../../components/assign_flyout';
import { ITagAssignmentService } from '../../services/assignments';
import { ITagsCache } from '../../services/tags';
import { StartServices } from '../../types';
import { TagAction } from './types';

interface GetAssignActionOptions extends StartServices {
  tagCache: ITagsCache;
  assignmentService: ITagAssignmentService;
  assignableTypes: string[];
  fetchTags: () => Promise<void>;
  canceled$: Observable<void>;
}

export const getAssignAction = ({
  assignableTypes,
  assignmentService,
  tagCache,
  fetchTags,
  canceled$,
  ...startServices
}: GetAssignActionOptions): TagAction => {
  const openFlyout = getAssignFlyoutOpener({
    ...startServices,
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
    available: (tag) => !tag.managed,
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
