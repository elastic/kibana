/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SAVE_BUTTON_LABEL } from '../../../shared/constants';
import { UnsavedChangesPrompt } from '../../../shared/unsaved_changes_prompt';
import { RESTORE_DEFAULTS_BUTTON_LABEL } from '../../constants';
import { getEngineBreadcrumbs } from '../engine';
import { AppSearchPageTemplate } from '../layout';

import { EmptyState } from './components';
import { RELEVANCE_TUNING_TITLE } from './constants';
import { RelevanceTuningCallouts } from './relevance_tuning_callouts';
import { RelevanceTuningForm } from './relevance_tuning_form';
import { RelevanceTuningPreview } from './relevance_tuning_preview';

import { RelevanceTuningLogic } from '.';

export const RelevanceTuning: React.FC = () => {
  const { dataLoading, engineHasSchemaFields, unsavedChanges } = useValues(RelevanceTuningLogic);
  const { initializeRelevanceTuning, resetSearchSettings, updateSearchSettings } = useActions(
    RelevanceTuningLogic
  );

  useEffect(() => {
    initializeRelevanceTuning();
  }, []);

  return (
    <AppSearchPageTemplate
      pageChrome={getEngineBreadcrumbs([RELEVANCE_TUNING_TITLE])}
      pageHeader={{
        pageTitle: RELEVANCE_TUNING_TITLE,
        description: i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.description',
          { defaultMessage: 'Set field weights and boosts.' }
        ),
        rightSideItems: engineHasSchemaFields
          ? [
              <EuiButton
                data-test-subj="SaveRelevanceTuning"
                color="primary"
                fill
                onClick={updateSearchSettings}
              >
                {SAVE_BUTTON_LABEL}
              </EuiButton>,
              <EuiButton
                data-test-subj="ResetRelevanceTuning"
                color="danger"
                onClick={resetSearchSettings}
              >
                {RESTORE_DEFAULTS_BUTTON_LABEL}
              </EuiButton>,
            ]
          : [],
      }}
      isLoading={dataLoading}
      isEmptyState={!engineHasSchemaFields}
      emptyState={<EmptyState />}
    >
      <UnsavedChangesPrompt hasUnsavedChanges={unsavedChanges} />
      <RelevanceTuningCallouts />

      <EuiFlexGroup alignItems="flexStart">
        <EuiFlexItem grow={3}>
          <RelevanceTuningForm />
        </EuiFlexItem>
        <EuiFlexItem grow={4}>
          <RelevanceTuningPreview />
        </EuiFlexItem>
      </EuiFlexGroup>
    </AppSearchPageTemplate>
  );
};
