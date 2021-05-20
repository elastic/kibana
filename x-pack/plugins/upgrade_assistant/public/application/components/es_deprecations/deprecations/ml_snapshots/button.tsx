/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FixSnapshotsProvider } from './fix_snapshots_provider';

const i18nTexts = {
  fixButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.upgradeButtonLabel',
    {
      defaultMessage: 'Fix',
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
  description: string;
}

export const FixMlSnapshotsButton: React.FunctionComponent<Props> = ({
  snapshotId,
  jobId,
  description,
}) => {
  return (
    <FixSnapshotsProvider>
      {(fixSnapshotsPrompt) => {
        return (
          <EuiButton
            size="s"
            data-test-subj="fixMlSnapshotsButton"
            onClick={() => fixSnapshotsPrompt({ snapshotId, jobId, description })}
          >
            {i18nTexts.fixButtonLabel}
          </EuiButton>
        );
      }}
    </FixSnapshotsProvider>
  );
};
