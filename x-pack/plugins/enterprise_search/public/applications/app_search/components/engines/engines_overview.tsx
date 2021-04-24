/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageContentBody,
  EuiTitle,
  EuiSpacer,
  EuiEmptyPrompt,
} from '@elastic/eui';

import { FlashMessages } from '../../../shared/flash_messages';
import { LicensingLogic } from '../../../shared/licensing';
import { convertMetaToPagination, handlePageChange } from '../../../shared/table_pagination';
import { SendAppSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';
import { EngineIcon, MetaEngineIcon } from '../../icons';

import { EnginesOverviewHeader, LoadingState, EmptyState } from './components';
import { EnginesTable } from './components/tables/engines_table';
import { MetaEnginesTable } from './components/tables/meta_engines_table';
import {
  ENGINES_TITLE,
  META_ENGINE_EMPTY_PROMPT_DESCRIPTION,
  META_ENGINE_EMPTY_PROMPT_TITLE,
  META_ENGINES_TITLE,
} from './constants';
import { EnginesLogic } from './engines_logic';

import './engines_overview.scss';

export const EnginesOverview: React.FC = () => {
  const { hasPlatinumLicense } = useValues(LicensingLogic);

  const {
    dataLoading,
    engines,
    enginesMeta,
    enginesLoading,
    metaEngines,
    metaEnginesMeta,
    metaEnginesLoading,
  } = useValues(EnginesLogic);

  const { loadEngines, loadMetaEngines, onEnginesPagination, onMetaEnginesPagination } = useActions(
    EnginesLogic
  );

  useEffect(() => {
    loadEngines();
  }, [enginesMeta.page.current]);

  useEffect(() => {
    if (hasPlatinumLicense) loadMetaEngines();
  }, [hasPlatinumLicense, metaEnginesMeta.page.current]);

  if (dataLoading) return <LoadingState />;
  if (!engines.length) return <EmptyState />;

  return (
    <>
      <SendTelemetry action="viewed" metric="engines_overview" />

      <EnginesOverviewHeader />
      <EuiPageContent hasBorder panelPaddingSize="s" className="enginesOverview">
        <FlashMessages />
        <EuiPageContentHeader responsive={false}>
          <EuiPageContentHeaderSection>
            <EuiTitle size="s">
              <h2>
                <EngineIcon /> {ENGINES_TITLE}
              </h2>
            </EuiTitle>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
        <EuiPageContentBody data-test-subj="appSearchEngines">
          <EuiSpacer />
          <EnginesTable
            items={engines}
            loading={enginesLoading}
            pagination={{
              ...convertMetaToPagination(enginesMeta),
              hidePerPageOptions: true,
            }}
            onChange={handlePageChange(onEnginesPagination)}
          />
        </EuiPageContentBody>

        {hasPlatinumLicense && (
          <>
            <EuiSpacer size="xl" />
            <EuiPageContentHeader>
              <EuiPageContentHeaderSection>
                <EuiTitle size="s">
                  <h2>
                    <MetaEngineIcon /> {META_ENGINES_TITLE}
                  </h2>
                </EuiTitle>
              </EuiPageContentHeaderSection>
            </EuiPageContentHeader>
            <EuiPageContentBody data-test-subj="appSearchMetaEngines">
              <MetaEnginesTable
                items={metaEngines}
                loading={metaEnginesLoading}
                pagination={{
                  ...convertMetaToPagination(metaEnginesMeta),
                  hidePerPageOptions: true,
                }}
                noItemsMessage={
                  <EuiEmptyPrompt
                    title={<h2>{META_ENGINE_EMPTY_PROMPT_TITLE}</h2>}
                    body={<p>{META_ENGINE_EMPTY_PROMPT_DESCRIPTION}</p>}
                  />
                }
                onChange={handlePageChange(onMetaEnginesPagination)}
              />
            </EuiPageContentBody>
          </>
        )}
      </EuiPageContent>
    </>
  );
};
