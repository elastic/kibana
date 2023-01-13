/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';

import { EuiButton, EuiFieldSearch, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedNumber } from '@kbn/i18n-react';

import { DataPanel } from '../../../shared/data_panel/data_panel';

import { handlePageChange } from '../../../shared/table_pagination';

import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

import { EnginesListTable } from './components/tables/engines_table';
import { DeleteEngineModal } from './delete_engine_modal';
import { EnginesListLogic } from './engines_list_logic';

export const EnginesList: React.FC = () => {
  const { fetchEngines, onPaginate, openDeleteEngineModal } = useActions(EnginesListLogic);
  const { meta, results } = useValues(EnginesListLogic);
  const [searchQuery, setSearchValue] = useState('');

  useEffect(() => {
    fetchEngines({
      meta,
      searchQuery,
    });
  }, [meta.from, meta.size, searchQuery]);

  return (
    <>
      <DeleteEngineModal />
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
              data-test-subj="enterprise-search-content-engines-creation-button"
              data-telemetry-id={`entSearchContent-engines-list-createEngine `}
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
          <FormattedMessage
            id="xpack.enterpriseSearch.content.engines.description"
            defaultMessage="Engines allow you to query indexed data with a complete set of relevance, analytics and personalization tools. To learn more about how engines work in Enterprise search {documentationUrl}"
            values={{
              documentationUrl: (
                <EuiLink
                  data-test-subj="engines-documentation-link"
                  href="TODO"
                  target="_blank"
                  data-telemetry-id={`entSearchContent-engines-documentation-viewDocumentaion `}
                >
                  {' '}
                  {/* TODO: navigate to documentation url */}{' '}
                  {i18n.translate('xpack.enterpriseSearch.content.engines.documentation', {
                    defaultMessage: 'explore our Engines documentation',
                  })}
                </EuiLink>
              ),
            }}
          />
        </EuiText>
        <EuiSpacer />
        <div>
          <EuiFieldSearch
            value={searchQuery}
            placeholder={i18n.translate(
              'xpack.enterpriseSearch.content.engines.searchPlaceholder',
              {
                defaultMessage: 'Search engines',
              }
            )}
            aria-label={i18n.translate(
              'xpack.enterpriseSearch.content.engines.searchBar.ariaLabel',
              {
                defaultMessage: 'Search engines',
              }
            )}
            fullWidth
            onChange={(event) => {
              setSearchValue(event.currentTarget.value);
            }}
          />
        </div>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="s">
          {i18n.translate('xpack.enterpriseSearch.content.engines.searchPlaceholder.description', {
            defaultMessage: 'Locate an engine via name or indices',
          })}
        </EuiText>

        <EuiSpacer size="m" />
        <EuiText size="s">
          <FormattedMessage
            id="xpack.enterpriseSearch.content.engines.enginesList.description"
            defaultMessage="Showing {currentPage}-{size} of {total}"
            values={{
              currentPage: (
                <strong>
                  <FormattedNumber value={meta.from} />
                </strong>
              ),
              size: (
                <strong>
                  <FormattedNumber value={meta.size} />
                </strong>
              ),
              total: <FormattedNumber value={meta.total} />,
            }}
          />
        </EuiText>
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
            enginesList={results}
            meta={meta}
            onChange={handlePageChange(onPaginate)}
            onDelete={openDeleteEngineModal}
            loading={false}
          />
        </DataPanel>

        <EuiSpacer size="xxl" />
        <div />
      </EnterpriseSearchContentPageTemplate>
    </>
  );
};
