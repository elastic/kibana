/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiButton, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { UnsavedChangesPrompt } from '../../../shared/unsaved_changes_prompt';
import { DOCS_PREFIX } from '../../routes';

import { RelevanceTuningForm } from './relevance_tuning_form';
import { RelevanceTuningLayout } from './relevance_tuning_layout';

import { RelevanceTuningLogic } from '.';

interface Props {
  engineBreadcrumb: string[];
}

const EmptyCallout: React.FC = () => {
  return (
    <EuiEmptyPrompt
      title={
        <h2>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.emptyErrorMessageTitle',
            {
              defaultMessage: 'Tuning requires schema fields',
            }
          )}
        </h2>
      }
      body={i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.emptyErrorMessage',
        {
          defaultMessage: 'Index documents to tune relevance.',
        }
      )}
      actions={
        <EuiButton
          size="s"
          color="primary"
          href={`${DOCS_PREFIX}/relevance-tuning-guide.html`}
          fill
        >
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.emptyButtonLabel',
            {
              defaultMessage: 'Read the relevance tuning guide',
            }
          )}
        </EuiButton>
      }
    />
  );
};

export const RelevanceTuning: React.FC<Props> = ({ engineBreadcrumb }) => {
  const { engineHasSchemaFields, unsavedChanges } = useValues(RelevanceTuningLogic);
  const { initializeRelevanceTuning } = useActions(RelevanceTuningLogic);

  useEffect(() => {
    initializeRelevanceTuning();
  }, []);

  return (
    <RelevanceTuningLayout engineBreadcrumb={engineBreadcrumb}>
      <UnsavedChangesPrompt hasUnsavedChanges={unsavedChanges} />
      {engineHasSchemaFields ? (
        <EuiFlexGroup>
          <EuiFlexItem>
            <RelevanceTuningForm />
          </EuiFlexItem>
          <EuiFlexItem />
        </EuiFlexGroup>
      ) : (
        <EmptyCallout />
      )}
    </RelevanceTuningLayout>
  );
};
