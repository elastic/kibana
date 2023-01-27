/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';
import useThrottle from 'react-use/lib/useThrottle';

import { EuiButton, EuiFieldSearch, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedNumber } from '@kbn/i18n-react';

import { INPUT_THROTTLE_DELAY_MS } from '../../../shared/constants/timers';

import { DataPanel } from '../../../shared/data_panel/data_panel';

import { EnterpriseSearchEnginesPageTemplate } from '../layout/engines_page_template';

import { EmptyEnginesPrompt } from './components/empty_engines_prompt';
import { EnginesListTable } from './components/tables/engines_table';
import { CreateEngineFlyout } from './create_engine_flyout';
import { DeleteEngineModal } from './delete_engine_modal';
import { EngineListIndicesFlyout } from './engines_list_flyout';
import { EnginesListFlyoutLogic } from './engines_list_flyout_logic';
import { EnginesListLogic } from './engines_list_logic';

const CreateButton: React.FC = () => {
  const { openEngineCreate } = useActions(EnginesListLogic);
  return (
    <EuiButton
      fill
      iconType="plusInCircle"
      data-test-subj="enterprise-search-content-engines-creation-button"
      data-telemetry-id="entSearchContent-engines-list-createEngine"
      onClick={openEngineCreate}
    >
      {i18n.translate('xpack.enterpriseSearch.content.engines.createEngineButtonLabel', {
        defaultMessage: 'Create engine',
      })}
    </EuiButton>
  );
};

export const EnginesList: React.FC = () => {
  const { closeEngineCreate, fetchEngines, onPaginate, openDeleteEngineModal, setSearchQuery } =
    useActions(EnginesListLogic);
  const { openFetchEngineFlyout } = useActions(EnginesListFlyoutLogic);
  const { isLoading, meta, results, createEngineFlyoutOpen, searchQuery } =
    useValues(EnginesListLogic);

  const throttledSearchQuery = useThrottle(searchQuery, INPUT_THROTTLE_DELAY_MS);

  useEffect(() => {
    fetchEngines();
  }, [meta.from, meta.size, throttledSearchQuery]);

  return (
    <>
      <DeleteEngineModal />

      <EngineListIndicesFlyout />
      {createEngineFlyoutOpen && <CreateEngineFlyout onClose={closeEngineCreate} />}
      <EnterpriseSearchEnginesPageTemplate
        pageChrome={[
          i18n.translate('xpack.enterpriseSearch.content.engines.breadcrumb', {
            defaultMessage: 'Engines',
          }),
        ]}
        pageHeader={{
          description: (
            <FormattedMessage
              id="xpack.enterpriseSearch.content.engines.description"
              defaultMessage="Engines allow you to query indexed data with a complete set of relevance, analytics and personalization tools. To learn more about how engines work in Enterprise search {documentationUrl}"
              values={{
                documentationUrl: (
                  <EuiLink
                    data-test-subj="engines-documentation-link"
                    href="TODO"
                    target="_blank"
                    data-telemetry-id="entSearchContent-engines-documentation-viewDocumentaion"
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
          ),
          pageTitle: i18n.translate('xpack.enterpriseSearch.content.engines.title', {
            defaultMessage: 'Engines',
          }),
          rightSideItems: results.length ? [<CreateButton />] : [],
        }}
        pageViewTelemetry="Engines"
        isLoading={isLoading}
      >
        <EuiSpacer />
        {results.length ? (
          <>
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
                  setSearchQuery(event.currentTarget.value);
                }}
              />
            </div>
            <EuiSpacer size="s" />
            <EuiText color="subdued" size="s">
              {i18n.translate(
                'xpack.enterpriseSearch.content.engines.searchPlaceholder.description',
                {
                  defaultMessage: 'Locate an engine via name or indices',
                }
              )}
            </EuiText>

            <EuiSpacer size="m" />
            <EuiText size="s">
              <FormattedMessage
                id="xpack.enterpriseSearch.content.engines.enginesList.description"
                defaultMessage="Showing {from}-{to} of {total}"
                values={{
                  from: (
                    <strong>
                      <FormattedNumber value={meta.from + 1} />
                    </strong>
                  ),
                  to: (
                    <strong>
                      <FormattedNumber value={meta.from + (results?.length ?? 0)} />
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
                onChange={onPaginate}
                onDelete={openDeleteEngineModal}
                viewEngineIndices={openFetchEngineFlyout}
                loading={false}
              />
            </DataPanel>
          </>
        ) : (
          <EmptyEnginesPrompt>
            <CreateButton />
          </EmptyEnginesPrompt>
        )}

        <EuiSpacer size="xxl" />
        <div />
      </EnterpriseSearchEnginesPageTemplate>
    </>
  );
};
