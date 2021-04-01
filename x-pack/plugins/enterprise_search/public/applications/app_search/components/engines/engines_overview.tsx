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
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { LicensingLogic } from '../../../shared/licensing';
import { EuiButtonTo } from '../../../shared/react_router_helpers';
import { convertMetaToPagination, handlePageChange } from '../../../shared/table_pagination';
import { SendAppSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';
import { AppLogic } from '../../app_logic';
import { EngineIcon, MetaEngineIcon } from '../../icons';
import { ENGINE_CREATION_PATH, META_ENGINE_CREATION_PATH } from '../../routes';

import { EnginesOverviewHeader, LoadingState, EmptyState } from './components';
import {
  CREATE_AN_ENGINE_BUTTON_LABEL,
  CREATE_A_META_ENGINE_BUTTON_LABEL,
  ENGINES_TITLE,
  META_ENGINE_EMPTY_PROMPT_DESCRIPTION,
  META_ENGINE_EMPTY_PROMPT_TITLE,
  META_ENGINES_TITLE,
} from './constants';
import { EnginesLogic } from './engines_logic';
import { EnginesTable } from './engines_table';

import './engines_overview.scss';

export const EnginesOverview: React.FC = () => {
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const {
    myRole: { canManageEngines },
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

  const {
    deleteEngine,
    loadEngines,
    loadMetaEngines,
    onEnginesPagination,
    onMetaEnginesPagination,
  } = useActions(EnginesLogic);

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
      <SetPageChrome />
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
          <EuiPageContentHeaderSection>
            {canManageEngines && (
              <EuiButtonTo
                color="primary"
                fill
                data-test-subj="appSearchEnginesEngineCreationButton"
                to={ENGINE_CREATION_PATH}
              >
                {CREATE_AN_ENGINE_BUTTON_LABEL}
              </EuiButtonTo>
            )}
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
            onDeleteEngine={deleteEngine}
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
              <EuiPageContentHeaderSection>
                {canManageEngines && (
                  <EuiButtonTo
                    color="primary"
                    fill
                    data-test-subj="appSearchEnginesMetaEngineCreationButton"
                    to={META_ENGINE_CREATION_PATH}
                  >
                    {CREATE_A_META_ENGINE_BUTTON_LABEL}
                  </EuiButtonTo>
                )}
              </EuiPageContentHeaderSection>
            </EuiPageContentHeader>
            <EuiPageContentBody data-test-subj="appSearchMetaEngines">
              <EnginesTable
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
                    actions={
                      canManageEngines && (
                        <EuiButtonTo
                          data-test-subj="appSearchMetaEnginesEmptyStateCreationButton"
                          fill
                          to={META_ENGINE_CREATION_PATH}
                        >
                          {CREATE_A_META_ENGINE_BUTTON_LABEL}
                        </EuiButtonTo>
                      )
                    }
                  />
                }
                onChange={handlePageChange(onMetaEnginesPagination)}
                onDeleteEngine={deleteEngine}
              />
            </EuiPageContentBody>
          </>
        )}
      </EuiPageContent>
    </>
  );
};
