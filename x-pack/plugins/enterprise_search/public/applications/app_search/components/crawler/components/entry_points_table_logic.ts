/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { clearFlashMessages, flashSuccessToast } from '../../../../shared/flash_messages';

import { CrawlerSingleDomainLogic } from '../crawler_single_domain_logic';

import { EntryPoint } from '../types';

interface EntryPointsTableValues {
  dataLoading: boolean;
}

interface EntryPointsTableActions {
  onAdd(
    entryPoint: EntryPoint,
    entryPoints: EntryPoint[]
  ): { entryPoint: EntryPoint; entryPoints: EntryPoint[] };
  onDelete(
    entryPoint: EntryPoint,
    entryPoints: EntryPoint[]
  ): { entryPoint: EntryPoint; entryPoints: EntryPoint[] };
  onUpdate(
    entryPoint: EntryPoint,
    entryPoints: EntryPoint[]
  ): { entryPoint: EntryPoint; entryPoints: EntryPoint[] };
}

export const EntryPointsTableLogic = kea<
  MakeLogicType<EntryPointsTableValues, EntryPointsTableActions>
>({
  path: ['enterprise_search', 'app_search', 'crawler', 'entry_points_table'],
  actions: () => ({
    onAdd: (entryPoint, entryPoints) => ({ entryPoint, entryPoints }),
    onDelete: (entryPoint, entryPoints) => ({ entryPoint, entryPoints }),
    onUpdate: (entryPoint, entryPoints) => ({ entryPoint, entryPoints }),
  }),
  listeners: () => ({
    onAdd: ({ entryPoints }) => {
      CrawlerSingleDomainLogic.actions.updateEntryPoints(entryPoints);
      clearFlashMessages();
    },
    onDelete: ({ entryPoint, entryPoints }) => {
      CrawlerSingleDomainLogic.actions.updateEntryPoints(entryPoints);
      clearFlashMessages();
      flashSuccessToast(
        i18n.translate(
          'xpack.enterpriseSearch.appSearch.crawler.entryPointsTable.deleteSuccessToastMessage',
          {
            defaultMessage: 'Entry point "{value}" was removed.',
            values: { value: entryPoint.value },
          }
        )
      );
    },
    onUpdate: ({ entryPoints }) => {
      CrawlerSingleDomainLogic.actions.updateEntryPoints(entryPoints);
      clearFlashMessages();
    },
  }),
});
