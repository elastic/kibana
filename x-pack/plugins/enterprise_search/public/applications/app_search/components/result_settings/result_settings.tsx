/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiPageHeader, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';

import { Loading } from '../../../shared/loading';

import { RESULT_SETTINGS_TITLE } from './constants';
import { ResultSettingsTable } from './result_settings_table';

import { SampleResponse } from './sample_response';

import { ResultSettingsLogic } from '.';

interface Props {
  engineBreadcrumb: string[];
}

export const ResultSettings: React.FC<Props> = ({ engineBreadcrumb }) => {
  const { dataLoading } = useValues(ResultSettingsLogic);
  const { initializeResultSettingsData } = useActions(ResultSettingsLogic);

  useEffect(() => {
    initializeResultSettingsData();
  }, []);

  if (dataLoading) return <Loading />;

  return (
    <>
      <SetPageChrome trail={[...engineBreadcrumb, RESULT_SETTINGS_TITLE]} />
      <EuiPageHeader
        pageTitle={RESULT_SETTINGS_TITLE}
        description={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.resultSettings.pageDescription',
          { defaultMessage: 'Enrich search results and select which fields will appear.' }
        )}
      />
      <FlashMessages />
      <EuiFlexGroup alignItems="flexStart">
        <EuiFlexItem grow={5}>
          <ResultSettingsTable />
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <SampleResponse />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
