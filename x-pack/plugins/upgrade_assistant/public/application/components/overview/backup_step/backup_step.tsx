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
import { CloudBackup, CloudBackupStatusResponse } from './cloud_backup';

const title = i18n.translate('xpack.upgradeAssistant.overview.backupStepTitle', {
  defaultMessage: 'Back up your data',
});

interface Props {
  cloud?: CloudSetup;
  cloudBackupStatusResponse?: CloudBackupStatusResponse;
}

export const getBackupStep = ({ cloud, cloudBackupStatusResponse }: Props): EuiStepProps => {
  if (cloud?.isCloudEnabled) {
    return {
      title,
      status: cloudBackupStatusResponse!.data?.isBackedUp ? 'complete' : 'incomplete',
      children: (
        <CloudBackup
          cloudBackupStatusResponse={cloudBackupStatusResponse!}
          cloudSnapshotsUrl={cloud!.snapshotsUrl!}
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
