/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';

import type { CloudSetup } from '../../../../../../cloud/public';
import { OnPremBackup } from './on_prem_backup';
import { CloudBackup } from './cloud_backup';
import type { OverviewStepsProps } from '../../types';

const title = i18n.translate('xpack.upgradeAssistant.overview.backupStepTitle', {
  defaultMessage: 'Back up your data',
});

interface Props extends OverviewStepsProps {
  cloud?: CloudSetup;
}

export const getBackupStep = ({ cloud, isComplete, setIsComplete }: Props): EuiStepProps => {
  const status = isComplete ? 'complete' : 'incomplete';

  if (cloud?.isCloudEnabled) {
    return {
      status,
      title,
      'data-test-subj': `backupStep-${status}`,
      children: (
        <CloudBackup
          cloudSnapshotsUrl={`${cloud!.deploymentUrl}/elasticsearch/snapshots`}
          setIsComplete={setIsComplete}
        />
      ),
    };
  }

  return {
    title,
    status: 'incomplete',
    children: <OnPremBackup />,
  };
};
