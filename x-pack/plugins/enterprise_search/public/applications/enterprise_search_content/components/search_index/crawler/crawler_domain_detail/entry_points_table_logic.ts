/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { clearFlashMessages, flashSuccessToast } from '../../../../../shared/flash_messages';

import { EntryPoint } from '../../../../api/crawler/types';

import { CrawlerDomainDetailLogic } from './crawler_domain_detail_logic';

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

export const EntryPointsTableLogic = kea<MakeLogicType<{}, EntryPointsTableActions>>({
  path: ['enterprise_search', 'app_search', 'crawler', 'entry_points_table'],
  actions: () => ({
    onAdd: (entryPoint, entryPoints) => ({ entryPoint, entryPoints }),
    onDelete: (entryPoint, entryPoints) => ({ entryPoint, entryPoints }),
    onUpdate: (entryPoint, entryPoints) => ({ entryPoint, entryPoints }),
  }),
  listeners: () => ({
    onAdd: ({ entryPoints }) => {
      CrawlerDomainDetailLogic.actions.updateEntryPoints(entryPoints);
      clearFlashMessages();
    },
    onDelete: ({ entryPoint, entryPoints }) => {
      CrawlerDomainDetailLogic.actions.updateEntryPoints(entryPoints);
      clearFlashMessages();
      flashSuccessToast(`Entry point "${entryPoint.value}" was removed.`);
    },
    onUpdate: ({ entryPoints }) => {
      CrawlerDomainDetailLogic.actions.updateEntryPoints(entryPoints);
      clearFlashMessages();
    },
  }),
});
