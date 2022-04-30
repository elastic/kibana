/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiCard } from '@elastic/eui';

interface CardProps {
  onClick: () => void;
  isSelected: boolean;
}

export const RareCard: FC<CardProps> = ({ onClick, isSelected }) => (
  <EuiFlexItem>
    <EuiCard
      data-test-subj={`mlJobWizardCategorizationDetectorRareCard${isSelected ? ' selected' : ''}`}
      title={i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.rareDetectorSelect.rareCard.title',
        {
          defaultMessage: 'Rare',
        }
      )}
      description={
        <>
          <FormattedMessage
            id="xpack.ml.newJob.wizard.pickFieldsStep.rareDetectorSelect.rareCard.description"
            defaultMessage="Find rare values over time."
          />
        </>
      }
      selectable={{ onClick, isSelected }}
    />
  </EuiFlexItem>
);

export const RareInPopulationCard: FC<CardProps> = ({ onClick, isSelected }) => (
  <EuiFlexItem>
    <EuiCard
      data-test-subj={`mlJobWizardCategorizationDetectorRareCard${isSelected ? ' selected' : ''}`}
      title={i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.rareDetectorSelect.rarePopulationCard.title',
        {
          defaultMessage: 'Rare in population',
        }
      )}
      description={
        <>
          <FormattedMessage
            id="xpack.ml.newJob.wizard.pickFieldsStep.rareDetectorSelect.rarePopulationCard.description"
            defaultMessage="Find members of a population that have rare values over time."
          />
        </>
      }
      selectable={{ onClick, isSelected }}
    />
  </EuiFlexItem>
);

export const FrequentlyRareInPopulationCard: FC<CardProps> = ({ onClick, isSelected }) => (
  <EuiFlexItem>
    <EuiCard
      data-test-subj={`mlJobWizardCategorizationDetectorRareCard${isSelected ? ' selected' : ''}`}
      title={i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.rareDetectorSelect.freqRareCard.title',
        {
          defaultMessage: 'Frequently rare in population',
        }
      )}
      description={
        <>
          <FormattedMessage
            id="xpack.ml.newJob.wizard.pickFieldsStep.rareDetectorSelect.freqRareCard.description"
            defaultMessage="Find members of a population that frequently have rare values."
          />
        </>
      }
      selectable={{ onClick, isSelected }}
    />
  </EuiFlexItem>
);
