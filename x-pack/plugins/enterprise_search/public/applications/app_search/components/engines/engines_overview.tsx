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
} from '@elastic/eui';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { EuiButtonTo } from '../../../shared/react_router_helpers';
import { convertMetaToPagination, handlePageChange } from '../../../shared/table_pagination';
import { SendAppSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';
import { AppLogic } from '../../app_logic';
import { ENGINE_CREATION_PATH } from '../../routes';

import { EngineIcon } from './assets/engine_icon';
import { MetaEngineIcon } from './assets/meta_engine_icon';
import { EnginesOverviewHeader, LoadingState, EmptyState } from './components';
import { CREATE_AN_ENGINE_BUTTON_LABEL, ENGINES_TITLE, META_ENGINES_TITLE } from './constants';
import { EnginesLogic } from './engines_logic';
import { EnginesTable } from './engines_table';

import './engines_overview.scss';

export const EnginesOverview: React.FC = () => {
  const {
    myRole: { canViewMetaEngines },
  } = useValues(AppLogic);

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
    if (canViewMetaEngines) loadMetaEngines();
  }, [canViewMetaEngines, metaEnginesMeta.page.current]);

  if (dataLoading) return <LoadingState />;
  if (!engines.length) return <EmptyState />;

  return (
    <>
      <SetPageChrome />
      <SendTelemetry action="viewed" metric="engines_overview" />

      <EnginesOverviewHeader />
      <EuiPageContent panelPaddingSize="s" className="enginesOverview">
        <FlashMessages />
        <EuiPageContentHeader responsive={false}>
          <EuiPageContentHeaderSection>
            <EuiTitle size="s">
              <h2>
                <EngineIcon /> {ENGINES_TITLE}
              </h2>
            </EuiTitle>
          </EuiPageContentHeaderSection>
          <EuiPageContentHeaderSection>
            <EuiButtonTo
              color="primary"
              fill
              data-test-subj="appSearchEnginesEngineCreationButton"
              to={ENGINE_CREATION_PATH}
            >
              {CREATE_AN_ENGINE_BUTTON_LABEL}
            </EuiButtonTo>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
        <EuiPageContentBody data-test-subj="appSearchEngines">
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

        {canViewMetaEngines && (
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
                items={metaEngines}
                loading={metaEnginesLoading}
                pagination={{
                  ...convertMetaToPagination(metaEnginesMeta),
                  hidePerPageOptions: true,
                }}
                onChange={handlePageChange(onMetaEnginesPagination)}
              />
            </EuiPageContentBody>
          </>
        )}
      </EuiPageContent>
    </>
  );
};
