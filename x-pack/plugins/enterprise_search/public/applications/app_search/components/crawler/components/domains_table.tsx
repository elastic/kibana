/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiInMemoryTable, EuiBasicTableColumn } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { DELETE_BUTTON_LABEL, MANAGE_BUTTON_LABEL } from '../../../../shared/constants';
import { KibanaLogic } from '../../../../shared/kibana';
import { AppLogic } from '../../../app_logic';
import { ENGINE_CRAWLER_DOMAIN_PATH } from '../../../routes';
import { EngineLogic, generateEnginePath } from '../../engine';
import { CrawlerOverviewLogic } from '../crawler_overview_logic';
import { CrawlerDomain } from '../types';

import { determineTimestampDisplay } from './utils';

export const DomainsTable: React.FC = () => {
  const { domains } = useValues(CrawlerOverviewLogic);

  const { deleteDomain } = useActions(CrawlerOverviewLogic);

  const { engineName } = useValues(EngineLogic);

  const {
    myRole: { canManageEngineCrawler },
  } = useValues(AppLogic);

  const columns: Array<EuiBasicTableColumn<CrawlerDomain>> = [
    {
      field: 'url',
      name: 'Domain URL',
    },
    {
      field: 'lastCrawl',
      name: 'Last activity',
      render: (lastCrawl: CrawlerDomain['lastCrawl']) =>
        lastCrawl ? determineTimestampDisplay(lastCrawl) : '',
    },
    {
      field: 'documentCount',
      name: 'Documents',
      render: (documentCount: CrawlerDomain['documentCount']) => documentCount.toLocaleString(),
    },
  ];

  const actionsColumn: EuiBasicTableColumn<CrawlerDomain> = {
    name: i18n.translate(
      'xpack.enterpriseSearch.appSearch.crawlerOverview.domainsTable.column.actions',
      {
        defaultMessage: 'Actions',
      }
    ),
    actions: [
      {
        name: MANAGE_BUTTON_LABEL,
        description: i18n.translate(
          'xpack.enterpriseSearch.appSearch.crawlerOverview.domainsTable.action.manage.buttonDescription',
          {
            defaultMessage: 'Manage this engine',
          }
        ),
        type: 'icon',
        icon: 'eye',
        onClick: (domain) =>
          KibanaLogic.values.navigateToUrl(
            generateEnginePath(ENGINE_CRAWLER_DOMAIN_PATH, { engineName, domainId: domain.id })
          ),
      },
      {
        name: DELETE_BUTTON_LABEL,
        description: i18n.translate(
          'xpack.enterpriseSearch.appSearch.crawlerOverview.domainsTable.action.delete.buttonDescription',
          {
            defaultMessage: 'Delete this engine',
          }
        ),
        type: 'icon',
        icon: 'trash',
        color: 'danger',
        onClick: (domain) => {
          if (
            window.confirm(
              i18n.translate(
                'xpack.enterpriseSearch.appSearch.crawlerOverview.domainsTable.action.delete.confirmationPopupMessage',
                {
                  defaultMessage:
                    'Are you sure you want to remove the domain "{domainUrl}" and all of its settings?',
                  values: {
                    domainUrl: domain.url,
                  },
                }
              )
            )
          ) {
            deleteDomain(domain);
          }
        },
      },
    ],
  };

  if (canManageEngineCrawler) {
    columns.push(actionsColumn);
  }

  return (
    <EuiInMemoryTable
      data-test-subj="DomainsTable"
      items={domains || []}
      loading={domains === null}
      columns={columns}
      sorting
    />
  );
};
