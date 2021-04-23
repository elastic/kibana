/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { Loading } from '../../../shared/loading';
import { UnsavedChangesPrompt } from '../../../shared/unsaved_changes_prompt';

import { EmptyState } from './components';
import { RelevanceTuningForm } from './relevance_tuning_form';
import { RelevanceTuningLayout } from './relevance_tuning_layout';
import { RelevanceTuningPreview } from './relevance_tuning_preview';

import { RelevanceTuningLogic } from '.';

export const RelevanceTuning: React.FC = () => {
  const { dataLoading, engineHasSchemaFields, unsavedChanges } = useValues(RelevanceTuningLogic);
  const { initializeRelevanceTuning } = useActions(RelevanceTuningLogic);

  useEffect(() => {
    initializeRelevanceTuning();
  }, []);

  if (dataLoading) return <Loading />;

  return (
    <RelevanceTuningLayout>
      <UnsavedChangesPrompt hasUnsavedChanges={unsavedChanges} />
      {engineHasSchemaFields ? (
        <EuiFlexGroup alignItems="flexStart">
          <EuiFlexItem grow={3}>
            <RelevanceTuningForm />
          </EuiFlexItem>
          <EuiFlexItem grow={4}>
            <RelevanceTuningPreview />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EmptyState />
      )}
    </RelevanceTuningLayout>
  );
};
