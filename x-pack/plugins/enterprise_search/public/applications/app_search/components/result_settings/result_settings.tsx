/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiPageHeader, EuiFlexGroup, EuiFlexItem, EuiButton, EuiButtonEmpty } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { SAVE_BUTTON_LABEL } from '../../../shared/constants';
import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { Loading } from '../../../shared/loading';
import { RESTORE_DEFAULTS_BUTTON_LABEL } from '../../constants';
import { getEngineBreadcrumbs } from '../engine';

import { RESULT_SETTINGS_TITLE } from './constants';
import { ResultSettingsTable } from './result_settings_table';
import { SampleResponse } from './sample_response';

import { ResultSettingsLogic } from '.';

const CLEAR_BUTTON_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.resultSettings.clearButtonLabel',
  { defaultMessage: 'Clear all values' }
);

export const ResultSettings: React.FC = () => {
  const { dataLoading } = useValues(ResultSettingsLogic);
  const {
    initializeResultSettingsData,
    saveResultSettings,
    confirmResetAllFields,
    clearAllFields,
  } = useActions(ResultSettingsLogic);

  useEffect(() => {
    initializeResultSettingsData();
  }, []);

  if (dataLoading) return <Loading />;

  return (
    <>
      <SetPageChrome trail={getEngineBreadcrumbs([RESULT_SETTINGS_TITLE])} />
      <EuiPageHeader
        pageTitle={RESULT_SETTINGS_TITLE}
        description={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.resultSettings.pageDescription',
          { defaultMessage: 'Enrich search results and select which fields will appear.' }
        )}
        rightSideItems={[
          <EuiButton
            data-test-subj="SaveResultSettings"
            color="primary"
            fill
            onClick={saveResultSettings}
          >
            {SAVE_BUTTON_LABEL}
          </EuiButton>,
          <EuiButton
            data-test-subj="ResetResultSettings"
            color="danger"
            onClick={confirmResetAllFields}
          >
            {RESTORE_DEFAULTS_BUTTON_LABEL}
          </EuiButton>,
          <EuiButtonEmpty data-test-subj="ClearResultSettings" onClick={clearAllFields}>
            {CLEAR_BUTTON_LABEL}
          </EuiButtonEmpty>,
        ]}
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
