/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';

interface Props {
  nextMajor: number;
}

const i18nTexts = {
  backupStepTitle: i18n.translate('xpack.upgradeAssistant.overview.backupStepTitle', {
    defaultMessage: 'Back up your data',
  }),

  backupStepDescription: (nextMajor: number) =>
    i18n.translate('xpack.upgradeAssistant.overview.backupStepDescription', {
      defaultMessage: 'Back up your data before addressing any deprecation issues.',
      values: { nextMajor },
    }),
};

const BackupStep: React.FunctionComponent<Props> = ({ nextMajor }) => {
  return (
    <>
      <EuiText>
        <p>{i18nTexts.backupStepDescription(nextMajor)}</p>
      </EuiText>
    </>
  );
};

interface GetStepConfig {
  nextMajor: number;
}

export const getBackupStep = ({ nextMajor }: GetStepConfig): EuiStepProps => {
  return {
    title: i18nTexts.backupStepTitle,
    status: 'incomplete',
    children: <BackupStep nextMajor={nextMajor} />,
  };
};
