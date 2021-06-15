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
import { UnsavedChangesPrompt } from '../../../shared/unsaved_changes_prompt';
import { RESTORE_DEFAULTS_BUTTON_LABEL } from '../../constants';
import { getEngineBreadcrumbs } from '../engine';

import { EmptyState } from './components';
import { RESULT_SETTINGS_TITLE } from './constants';
import { ResultSettingsTable } from './result_settings_table';
import { SampleResponse } from './sample_response';

import { ResultSettingsLogic } from '.';

const CLEAR_BUTTON_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.resultSettings.clearButtonLabel',
  { defaultMessage: 'Clear all values' }
);

const UNSAVED_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.resultSettings.unsavedChangesMessage',
  { defaultMessage: 'Result Settings have not been saved. Are you sure you want to leave?' }
);

export const ResultSettings: React.FC = () => {
  const {
    dataLoading,
    schema,
    stagedUpdates,
    resultFieldsAtDefaultSettings,
    resultFieldsEmpty,
  } = useValues(ResultSettingsLogic);
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
  const hasSchema = Object.keys(schema).length > 0;

  return (
    <>
      <SetPageChrome trail={getEngineBreadcrumbs([RESULT_SETTINGS_TITLE])} />
      <UnsavedChangesPrompt hasUnsavedChanges={stagedUpdates} messageText={UNSAVED_MESSAGE} />
      <EuiPageHeader
        pageTitle={RESULT_SETTINGS_TITLE}
        description={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.resultSettings.pageDescription',
          { defaultMessage: 'Enrich search results and select which fields will appear.' }
        )}
        rightSideItems={
          hasSchema
            ? [
                <EuiButton
                  data-test-subj="SaveResultSettings"
                  color="primary"
                  fill
                  onClick={saveResultSettings}
                  disabled={resultFieldsEmpty || !stagedUpdates}
                >
                  {SAVE_BUTTON_LABEL}
                </EuiButton>,
                <EuiButton
                  data-test-subj="ResetResultSettings"
                  color="danger"
                  onClick={confirmResetAllFields}
                  disabled={resultFieldsAtDefaultSettings}
                >
                  {RESTORE_DEFAULTS_BUTTON_LABEL}
                </EuiButton>,
                <EuiButtonEmpty data-test-subj="ClearResultSettings" onClick={clearAllFields}>
                  {CLEAR_BUTTON_LABEL}
                </EuiButtonEmpty>,
              ]
            : []
        }
      />
      <FlashMessages />
      {hasSchema ? (
        <EuiFlexGroup alignItems="flexStart">
          <EuiFlexItem grow={5}>
            <ResultSettingsTable />
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <SampleResponse />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EmptyState />
      )}
    </>
  );
};
