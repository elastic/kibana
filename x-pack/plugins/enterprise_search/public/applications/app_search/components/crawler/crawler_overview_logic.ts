/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors, flashSuccessToast } from '../../../shared/flash_messages';

import { HttpLogic } from '../../../shared/http';
import { EngineLogic } from '../engine';

import { CrawlerLogic } from './crawler_logic';
import { CrawlerDomain } from './types';
import { crawlerDataServerToClient, getDeleteDomainSuccessMessage } from './utils';

interface CrawlerOverviewActions {
  deleteDomain(domain: CrawlerDomain): { domain: CrawlerDomain };
}

export const CrawlerOverviewLogic = kea<MakeLogicType<{}, CrawlerOverviewActions>>({
  path: ['enterprise_search', 'app_search', 'crawler', 'crawler_overview'],
  actions: {
    deleteDomain: (domain) => ({ domain }),
  },
  listeners: () => ({
    deleteDomain: async ({ domain }) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.delete(
          `/internal/app_search/engines/${engineName}/crawler/domains/${domain.id}`,
          {
            query: {
              respond_with: 'crawler_details',
            },
          }
        );
        const crawlerData = crawlerDataServerToClient(response);
        CrawlerLogic.actions.onReceiveCrawlerData(crawlerData);
        flashSuccessToast(getDeleteDomainSuccessMessage(domain.url));
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
