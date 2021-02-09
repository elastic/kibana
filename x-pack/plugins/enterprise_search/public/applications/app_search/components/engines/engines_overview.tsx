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
  EuiPageContentBody,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { LicensingLogic } from '../../../shared/licensing';
import { SendAppSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';

import { EngineIcon } from './assets/engine_icon';
import { MetaEngineIcon } from './assets/meta_engine_icon';
import { EnginesOverviewHeader, LoadingState, EmptyState } from './components';
import { ENGINES_TITLE, META_ENGINES_TITLE } from './constants';
import { EnginesLogic } from './engines_logic';
import { EnginesTable } from './engines_table';

import './engines_overview.scss';

export const EnginesOverview: React.FC = () => {
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const {
    dataLoading,
    engines,
    enginesTotal,
    enginesPage,
    metaEngines,
    metaEnginesTotal,
    metaEnginesPage,
  } = useValues(EnginesLogic);
  const { loadEngines, loadMetaEngines, onEnginesPagination, onMetaEnginesPagination } = useActions(
    EnginesLogic
  );

  useEffect(() => {
    loadEngines();
  }, [enginesPage]);

  useEffect(() => {
    if (hasPlatinumLicense) loadMetaEngines();
  }, [hasPlatinumLicense, metaEnginesPage]);

  if (dataLoading) return <LoadingState />;
  if (!engines.length) return <EmptyState />;

  return (
    <>
      <SetPageChrome />
      <SendTelemetry action="viewed" metric="engines_overview" />

      <EnginesOverviewHeader />
      <EuiPageContent panelPaddingSize="s" className="enginesOverview">
        <FlashMessages />
        <EuiPageContentHeader>
          <EuiTitle size="s">
            <h2>
              <EngineIcon /> {ENGINES_TITLE}
            </h2>
          </EuiTitle>
        </EuiPageContentHeader>
        <EuiPageContentBody data-test-subj="appSearchEngines">
          <EnginesTable
            data={engines}
            pagination={{
              totalEngines: enginesTotal,
              pageIndex: enginesPage - 1,
              onPaginate: onEnginesPagination,
            }}
          />
        </EuiPageContentBody>

        {metaEngines.length > 0 && (
          <>
            <EuiSpacer size="xl" />
            <EuiPageContentHeader>
              <EuiTitle size="s">
                <h2>
                  <MetaEngineIcon /> {META_ENGINES_TITLE}
                </h2>
              </EuiTitle>
            </EuiPageContentHeader>
            <EuiPageContentBody data-test-subj="appSearchMetaEngines">
              <EnginesTable
                data={metaEngines}
                pagination={{
                  totalEngines: metaEnginesTotal,
                  pageIndex: metaEnginesPage - 1,
                  onPaginate: onMetaEnginesPagination,
                }}
              />
            </EuiPageContentBody>
          </>
        )}
      </EuiPageContent>
    </>
  );
};
