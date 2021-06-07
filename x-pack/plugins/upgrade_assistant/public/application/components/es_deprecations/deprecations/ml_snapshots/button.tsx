/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { ButtonSize, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FixSnapshotsFlyout } from './fix_snapshots_flyout';
import { useAppContext } from '../../../../app_context';
import { useSnapshotStatus } from './use_snapshot_state';

const i18nTexts = {
  fixButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.fixButtonLabel',
    {
      defaultMessage: 'Fix',
    }
  ),
  upgradingButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.upgradingButtonLabel',
    {
      defaultMessage: 'Upgrading…',
    }
  ),
  doneButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.doneButtonLabel',
    {
      defaultMessage: 'Done',
    }
  ),
  failedButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.failedButtonLabel',
    {
      defaultMessage: 'Failed',
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
  const { api } = useAppContext();
  const {
    snapshotState,
    upgradeSnapshot,
    deleteSnapshot,
    updateSnapshotStatus,
  } = useSnapshotStatus({
    jobId,
    snapshotId,
    api,
  });

  const [showFlyout, setShowFlyout] = useState(false);

  useEffect(() => {
    updateSnapshotStatus();
  }, [updateSnapshotStatus]);

  const commonButtonProps = {
    size: 's' as ButtonSize,
    onClick: () => setShowFlyout(true),
    'data-test-subj': 'fixMlSnapshotsButton',
  };
  let button = <EuiButton {...commonButtonProps}>{i18nTexts.fixButtonLabel}</EuiButton>;

  switch (snapshotState.status) {
    case 'in_progress':
      button = (
        <EuiButton color="secondary" {...commonButtonProps} isLoading>
          {i18nTexts.upgradingButtonLabel}
        </EuiButton>
      );
      break;
    case 'complete':
      button = (
        <EuiButton color="secondary" iconType="check" {...commonButtonProps} disabled>
          {i18nTexts.doneButtonLabel}
        </EuiButton>
      );
      break;
    case 'error':
      button = (
        <EuiButton color="danger" iconType="cross" {...commonButtonProps}>
          {i18nTexts.failedButtonLabel}
        </EuiButton>
      );
      break;
  }

  return (
    <>
      {button}

      {showFlyout && (
        <FixSnapshotsFlyout
          snapshotState={snapshotState}
          upgradeSnapshot={upgradeSnapshot}
          deleteSnapshot={deleteSnapshot}
          description={description}
          closeFlyout={() => setShowFlyout(false)}
        />
      )}
    </>
  );
};
