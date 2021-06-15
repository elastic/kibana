/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageContentBody,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';

import { FlashMessages } from '../../../shared/flash_messages';
import { LicensingLogic } from '../../../shared/licensing';
import { EuiButtonTo } from '../../../shared/react_router_helpers';
import { convertMetaToPagination, handlePageChange } from '../../../shared/table_pagination';
import { SendAppSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';
import { AppLogic } from '../../app_logic';
import { EngineIcon, MetaEngineIcon } from '../../icons';
import { ENGINE_CREATION_PATH, META_ENGINE_CREATION_PATH } from '../../routes';

import {
  EnginesOverviewHeader,
  LoadingState,
  EmptyState,
  EmptyMetaEnginesState,
} from './components';
import { EnginesTable } from './components/tables/engines_table';
import { MetaEnginesTable } from './components/tables/meta_engines_table';
import {
  CREATE_AN_ENGINE_BUTTON_LABEL,
  CREATE_A_META_ENGINE_BUTTON_LABEL,
  ENGINES_TITLE,
  META_ENGINES_TITLE,
} from './constants';
import { EnginesLogic } from './engines_logic';

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
      <EuiPageContent hasBorder>
        <FlashMessages />
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EngineIcon />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h2>{ENGINES_TITLE}</h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageContentHeaderSection>
          <EuiPageContentHeaderSection>
            {canManageEngines && (
              <EuiButtonTo
                color="secondary"
                size="s"
                iconType="plusInCircle"
                data-test-subj="appSearchEnginesEngineCreationButton"
                to={ENGINE_CREATION_PATH}
              >
                {CREATE_AN_ENGINE_BUTTON_LABEL}
              </EuiButtonTo>
            )}
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
        <EuiPageContentBody data-test-subj="appSearchEngines">
          <EuiSpacer size="m" />
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
            <EuiSpacer size="xxl" />
            <EuiPageContentHeader>
              <EuiPageContentHeaderSection>
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <MetaEngineIcon />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiTitle size="s">
                      <h2>{META_ENGINES_TITLE}</h2>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPageContentHeaderSection>
              <EuiPageContentHeaderSection>
                {canManageEngines && (
                  <EuiButtonTo
                    color="secondary"
                    size="s"
                    iconType="plusInCircle"
                    data-test-subj="appSearchEnginesMetaEngineCreationButton"
                    to={META_ENGINE_CREATION_PATH}
                  >
                    {CREATE_A_META_ENGINE_BUTTON_LABEL}
                  </EuiButtonTo>
                )}
              </EuiPageContentHeaderSection>
            </EuiPageContentHeader>
            <EuiPageContentBody data-test-subj="appSearchMetaEngines">
              <EuiSpacer size="m" />
              <MetaEnginesTable
                items={metaEngines}
                loading={metaEnginesLoading}
                pagination={{
                  ...convertMetaToPagination(metaEnginesMeta),
                  hidePerPageOptions: true,
                }}
                noItemsMessage={<EmptyMetaEnginesState />}
                onChange={handlePageChange(onMetaEnginesPagination)}
              />
            </EuiPageContentBody>
          </>
        )}
      </EuiPageContent>
    </>
  );
};
