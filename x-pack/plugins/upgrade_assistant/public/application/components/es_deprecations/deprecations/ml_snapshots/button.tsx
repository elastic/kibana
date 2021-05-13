/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { UpgradeSnapshotsProvider } from './upgrade_snapshots_provider';

const i18nTexts = {
  upgradeButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.upgradeButtonLabel',
    {
      defaultMessage: 'Upgrade',
    }
  ),
  doneButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.doneButtonLabel',
    {
      defaultMessage: 'Done',
    }
  ),
};

interface Props {
  snapshotId: string;
  jobId: string;
}

export const UpgradeMlSnapshotsButton: React.FunctionComponent<Props> = ({ snapshotId, jobId }) => {
  return (
    <UpgradeSnapshotsProvider>
      {(upgradeSnapshotsPrompt) => {
        return (
          <EuiButton
            size="s"
            data-test-subj="upgradeMlSnapshotsButton"
            onClick={() => upgradeSnapshotsPrompt({ snapshotId, jobId })}
          >
            {i18nTexts.upgradeButtonLabel}
          </EuiButton>
        );
      }}
    </UpgradeSnapshotsProvider>
  );
};
