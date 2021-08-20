/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiButton, EuiSpacer } from '@elastic/eui';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';

import { useAppContext } from '../../../app_context';

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

const SnapshotRestoreAppLink: React.FunctionComponent = () => {
  const { share } = useAppContext();

  const [snapshotRestoreUrl, setSnapshotRestoreUrl] = useState<string | undefined>();

  useEffect(() => {
    const getSnapshotRestoreUrl = async () => {
      const locator = share.url.locators.get('SNAPSHOT_RESTORE_LOCATOR');

      if (!locator) {
        return;
      }

      const url = await locator.getUrl({
        page: 'snapshots',
      });
      setSnapshotRestoreUrl(url);
    };

    getSnapshotRestoreUrl();
  }, [share]);

  return (
    <EuiButton href={snapshotRestoreUrl} data-test-subj="snapshotRestoreLink">
      <FormattedMessage
        id="xpack.upgradeAssistant.overview.snapshotRestoreLink"
        defaultMessage="Create snapshot"
      />
    </EuiButton>
  );
};

const BackupStep: React.FunctionComponent<Props> = ({ nextMajor }) => {
  return (
    <>
      <EuiText>
        <p>{i18nTexts.backupStepDescription(nextMajor)}</p>
      </EuiText>

      <EuiSpacer size="s" />

      <SnapshotRestoreAppLink />
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
