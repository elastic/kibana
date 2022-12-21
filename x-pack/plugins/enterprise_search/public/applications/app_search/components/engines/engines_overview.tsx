/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useValues, useActions } from 'kea';

import { EuiSpacer } from '@elastic/eui';

import { EuiButtonTo } from '../../../shared/react_router_helpers';
import { convertMetaToPagination, handlePageChange } from '../../../shared/table_pagination';
import { AppLogic } from '../../app_logic';
import { EngineIcon, MetaEngineIcon } from '../../icons';
import { ENGINE_CREATION_PATH, META_ENGINE_CREATION_PATH } from '../../routes';
import { DataPanel } from '../data_panel';
import { AppSearchPageTemplate } from '../layout';

import { EmptyState, EmptyMetaEnginesState } from './components';
import { AuditLogsModal } from './components/audit_logs_modal/audit_logs_modal';
import { EnginesTable } from './components/tables/engines_table';
import { MetaEnginesTable } from './components/tables/meta_engines_table';
import {
  ENGINES_OVERVIEW_TITLE,
  CREATE_AN_ENGINE_BUTTON_LABEL,
  CREATE_A_META_ENGINE_BUTTON_LABEL,
  ENGINES_TITLE,
  META_ENGINES_TITLE,
} from './constants';
import { EnginesLogic } from './engines_logic';

export const EnginesOverview: React.FC = () => {
  const {
    myRole: { canManageEngines, canManageMetaEngines },
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

  const { loadEngines, loadMetaEngines, onEnginesPagination, onMetaEnginesPagination } =
    useActions(EnginesLogic);

  useEffect(() => {
    loadEngines();
  }, [enginesMeta.page.current]);

  useEffect(() => {
    loadMetaEngines();
  }, [metaEnginesMeta.page.current]);

  return (
    <AppSearchPageTemplate
      pageViewTelemetry="engines_overview"
      pageChrome={[ENGINES_TITLE]}
      pageHeader={{ pageTitle: ENGINES_OVERVIEW_TITLE }}
      isLoading={dataLoading}
      isEmptyState={!engines.length && !metaEngines.length}
      emptyState={<EmptyState />}
    >
      <DataPanel
        hasBorder
        iconType={EngineIcon}
        title={<h2>{ENGINES_TITLE}</h2>}
        titleSize="s"
        action={
          canManageEngines && (
            <EuiButtonTo
              color="success"
              size="s"
              iconType="plusInCircle"
              data-test-subj="appSearchEnginesEngineCreationButton"
              to={ENGINE_CREATION_PATH}
            >
              {CREATE_AN_ENGINE_BUTTON_LABEL}
            </EuiButtonTo>
          )
        }
        data-test-subj="appSearchEngines"
      >
        <EnginesTable
          items={engines}
          loading={enginesLoading}
          pagination={{
            ...convertMetaToPagination(enginesMeta),
            showPerPageOptions: false,
          }}
          onChange={handlePageChange(onEnginesPagination)}
        />
      </DataPanel>
      <EuiSpacer size="xxl" />
      <DataPanel
        hasBorder
        iconType={MetaEngineIcon}
        title={<h2>{META_ENGINES_TITLE}</h2>}
        titleSize="s"
        action={
          canManageMetaEngines && (
            <EuiButtonTo
              color="success"
              size="s"
              iconType="plusInCircle"
              data-test-subj="appSearchEnginesMetaEngineCreationButton"
              to={META_ENGINE_CREATION_PATH}
            >
              {CREATE_A_META_ENGINE_BUTTON_LABEL}
            </EuiButtonTo>
          )
        }
        data-test-subj="appSearchMetaEngines"
      >
        <MetaEnginesTable
          items={metaEngines}
          loading={metaEnginesLoading}
          pagination={{
            ...convertMetaToPagination(metaEnginesMeta),
            showPerPageOptions: false,
          }}
          noItemsMessage={<EmptyMetaEnginesState />}
          onChange={handlePageChange(onMetaEnginesPagination)}
        />
      </DataPanel>
      <AuditLogsModal />
    </AppSearchPageTemplate>
  );
};
