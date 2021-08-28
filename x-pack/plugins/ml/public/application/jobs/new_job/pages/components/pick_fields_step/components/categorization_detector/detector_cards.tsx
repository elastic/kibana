/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiCard, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import type { FC } from 'react';
import React from 'react';

interface CardProps {
  onClick: () => void;
  isSelected: boolean;
}

export const CountCard: FC<CardProps> = ({ onClick, isSelected }) => (
  <EuiFlexItem>
    <EuiCard
      data-test-subj={`mlJobWizardCategorizationDetectorCountCard${isSelected ? ' selected' : ''}`}
      title={i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.categorizationDetectorSelect.countCard.title',
        {
          defaultMessage: 'Count',
        }
      )}
      description={
        <>
          <FormattedMessage
            id="xpack.ml.newJob.wizard.pickFieldsStep.categorizationDetectorSelect.countCard.description"
            defaultMessage="Look for anomalies in the event rate of a particular category."
          />
        </>
      }
      selectable={{ onClick, isSelected }}
    />
  </EuiFlexItem>
);

export const RareCard: FC<CardProps> = ({ onClick, isSelected }) => (
  <EuiFlexItem>
    <EuiCard
      data-test-subj={`mlJobWizardCategorizationDetectorRareCard${isSelected ? ' selected' : ''}`}
      title={i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.categorizationDetectorSelect.rareCard.title',
        {
          defaultMessage: 'Rare',
        }
      )}
      description={
        <>
          <FormattedMessage
            id="xpack.ml.newJob.wizard.pickFieldsStep.categorizationDetectorSelect.rareCard.description"
            defaultMessage="Look for categories that occur rarely in time."
          />
        </>
      }
      selectable={{ onClick, isSelected }}
    />
  </EuiFlexItem>
);
