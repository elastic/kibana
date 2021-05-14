/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiPageHeader, EuiPageContent } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { Loading } from '../../../shared/loading';
import { AppLogic } from '../../app_logic';
import { getEngineBreadcrumbs } from '../engine';

import { AddSourceEnginesButton } from './components/add_source_engines_button';
import { AddSourceEnginesModal } from './components/add_source_engines_modal';
import { SourceEnginesTable } from './components/source_engines_table';
import { SourceEnginesLogic } from './source_engines_logic';

const SOURCE_ENGINES_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.souceEngines.title',
  {
    defaultMessage: 'Manage engines',
  }
);

export const SourceEngines: React.FC = () => {
  const {
    myRole: { canManageMetaEngineSourceEngines },
  } = useValues(AppLogic);
  const { fetchIndexedEngines, fetchSourceEngines } = useActions(SourceEnginesLogic);
  const { dataLoading, isModalOpen } = useValues(SourceEnginesLogic);

  useEffect(() => {
    fetchIndexedEngines();
    fetchSourceEngines();
  }, []);

  if (dataLoading) return <Loading />;

  return (
    <>
      <SetPageChrome trail={getEngineBreadcrumbs([SOURCE_ENGINES_TITLE])} />
      <EuiPageHeader
        pageTitle={SOURCE_ENGINES_TITLE}
        rightSideItems={canManageMetaEngineSourceEngines ? [<AddSourceEnginesButton />] : []}
      />
      <FlashMessages />
      <EuiPageContent hasBorder>
        <SourceEnginesTable />
        {isModalOpen && <AddSourceEnginesModal />}
      </EuiPageContent>
    </>
  );
};
