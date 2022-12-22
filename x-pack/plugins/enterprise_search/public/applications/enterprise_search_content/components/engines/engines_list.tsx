/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiButton, EuiFieldSearch, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { DataPanel } from '../../../shared/data_panel/data_panel';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

import { EnginesListTable } from './components/tables/engines_table';

import { EnginesListLogic } from './engines_list_logic';
// import { EngineListDetails, Meta } from './types';

export const EnginesList = () => {
  const { fetchEngines } = useActions(EnginesListLogic);
  const { meta, enginesList } = useValues(EnginesListLogic);

  useEffect(() => {
    fetchEngines({
      meta,
    });
    // onPaginate();
    // loadEngines();
  }, []);

  useEffect(() => {}, []);

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[
        i18n.translate('xpack.enterpriseSearch.content.engines.breadcrumb', {
          defaultMessage: 'Engines',
        }),
      ]}
      pageHeader={{
        pageTitle: i18n.translate('xpack.enterpriseSearch.content.engines.title', {
          defaultMessage: 'Engines',
        }),
        rightSideItems: [
          <EuiButton
            fill
            iconType="plusInCircle"
            data-test-subj="appSearchEnginesEngineCreationButton"
            href={'TODO'}
          >
            {i18n.translate('xpack.enterpriseSearch.content.engines.createEngineButtonLabel', {
              defaultMessage: 'Create engine',
            })}
          </EuiButton>,
        ],
      }}
      pageViewTelemetry="Engines"
      isLoading={false}
    >
      <EuiText>
        {i18n.translate('xpack.enterpriseSearch.content.engines.description', {
          defaultMessage:
            'Engines allow you to query indexed data with a complete set of relevance, analytics and personalization tools. To learn more about how engines work in Enterprise search ',
        })}

        <EuiLink data-test-subj="documentationLink" href="TODO" target="_blank">
          {i18n.translate('xpack.enterpriseSearch.content.engines.documentation', {
            defaultMessage: 'explore our Engines documentation',
          })}
        </EuiLink>
      </EuiText>
      <EuiSpacer />
      <div>
        <EuiFieldSearch
          placeholder={i18n.translate('xpack.enterpriseSearch.content.engines.searchPlaceholder', {
            defaultMessage: 'Search engines',
          })}
          fullWidth
        />
      </div>
      <EuiSpacer size="s" />
      <EuiText color="subdued" size="s">
        {i18n.translate('xpack.enterpriseSearch.content.engines.searchPlaceholder.description', {
          defaultMessage: 'Locate an engine via name or indices',
        })}
      </EuiText>

      <EuiSpacer />
      <DataPanel
        title={
          <h2>
            {i18n.translate('xpack.enterpriseSearch.content.engines.title', {
              defaultMessage: 'Engines',
            })}
          </h2>
        }
      >
        <EnginesListTable
          enginesList={enginesList}
          // meta={meta}
          loading={false}
          pagination={{
            pageIndex: 0,
            pageSize: 1,
            totalItemCount: 1,
            showPerPageOptions: false,
          }}
          onChange={() => {}}
        />
      </DataPanel>

      <EuiSpacer size="xxl" />
      <div />
    </EnterpriseSearchContentPageTemplate>
  );
};
