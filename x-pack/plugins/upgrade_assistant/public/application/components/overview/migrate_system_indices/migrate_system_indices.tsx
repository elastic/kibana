/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiText,
  EuiButton,
  EuiSpacer,
  EuiIcon,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';

import type { OverviewStepProps } from '../../types';
import { useMigrateSystemIndices } from './use_migrate_system_indices';

interface Props {
  setIsComplete: OverviewStepProps['setIsComplete'];
}

interface StepProps extends OverviewStepProps {
  nextMajor: number;
}

const i18nTexts = {
  title: i18n.translate('xpack.upgradeAssistant.overview.systemIndices.title', {
    defaultMessage: 'Migrate system indices',
  }),
  bodyDescription: (nextMajor: number) => (
    <FormattedMessage
      id="xpack.upgradeAssistant.overview.systemIndices.body"
      defaultMessage="Migrate the indices that store system information before you upgrade to {nextMajor}.0."
      values={{ nextMajor }}
    />
  ),
  startButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.systemIndices.startButtonLabel',
    {
      defaultMessage: 'Migrate indices',
    }
  ),
  inProgressButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.systemIndices.inProgressButtonLabel',
    {
      defaultMessage: 'Migration in progress',
    }
  ),
  noMigrationNeeded: i18n.translate(
    'xpack.upgradeAssistant.overview.systemIndices.noMigrationNeeded',
    {
      defaultMessage: 'Migration complete',
    }
  ),
  viewSystemIndicesStatus: i18n.translate(
    'xpack.upgradeAssistant.overview.systemIndices.viewSystemIndicesStatus',
    {
      defaultMessage: 'View migration information',
    }
  ),
  retryButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.systemIndices.retryButtonLabel',
    {
      defaultMessage: 'Retry migration',
    }
  ),
  loadingError: i18n.translate('xpack.upgradeAssistant.overview.systemIndices.loadingError', {
    defaultMessage: 'Could not retrieve the system indices status',
  }),
};

const MigrateSystemIndicesStep: FunctionComponent<Props> = ({ setIsComplete }) => {
  const { beginSystemIndicesMigration, startMigrationStatus, migrationStatus, setShowFlyout } =
    useMigrateSystemIndices();

  useEffect(() => {
    setIsComplete(migrationStatus.data?.migration_status === 'NO_MIGRATION_NEEDED');
    // Depending upon setIsComplete would create an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [migrationStatus.data?.migration_status]);

  if (migrationStatus.error) {
    return (
      <EuiCallOut
        title={i18nTexts.loadingError}
        color="danger"
        iconType="alert"
        data-test-subj="systemIndicesStatusErrorCallout"
      >
        <p>
          {migrationStatus.error.statusCode} - {migrationStatus.error.message}
        </p>
        <EuiButton
          color="danger"
          isLoading={migrationStatus.isLoading}
          onClick={migrationStatus.resendRequest}
          data-test-subj="systemIndicesStatusRetryButton"
        >
          {i18nTexts.retryButtonLabel}
        </EuiButton>
      </EuiCallOut>
    );
  }

  if (migrationStatus.data?.migration_status === 'NO_MIGRATION_NEEDED') {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" data-test-subj="noMigrationNeededSection">
        <EuiFlexItem grow={false}>
          <EuiIcon type="check" color="success" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText color="success">
            <p>{i18nTexts.noMigrationNeeded}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const isButtonDisabled = migrationStatus.isInitialRequest && migrationStatus.isLoading;
  const isMigrating = migrationStatus.data?.migration_status === 'IN_PROGRESS';

  return (
    <>
      {startMigrationStatus.statusType === 'error' && (
        <>
          <EuiCallOut
            size="s"
            color="danger"
            iconType="alert"
            title={`${startMigrationStatus.error!.statusCode} - ${
              startMigrationStatus.error!.message
            }`}
            data-test-subj="startSystemIndicesMigrationCalloutError"
          />
          <EuiSpacer size="m" />
        </>
      )}

      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton
            isLoading={isMigrating}
            isDisabled={isButtonDisabled}
            onClick={beginSystemIndicesMigration}
            data-test-subj="startSystemIndicesMigrationButton"
          >
            {isMigrating ? i18nTexts.inProgressButtonLabel : i18nTexts.startButtonLabel}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={() => setShowFlyout(true)}
            isDisabled={isButtonDisabled}
            data-test-subj="viewSystemIndicesStateButton"
          >
            {i18nTexts.viewSystemIndicesStatus}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const getMigrateSystemIndicesStep = ({
  nextMajor,
  isComplete,
  setIsComplete,
}: StepProps): EuiStepProps => {
  const status = isComplete ? 'complete' : 'incomplete';

  return {
    title: i18nTexts.title,
    status,
    'data-test-subj': `migrateSystemIndicesStep-${status}`,
    children: (
      <>
        <EuiText>
          <p>{i18nTexts.bodyDescription(nextMajor)}</p>
        </EuiText>

        <EuiSpacer size="m" />

        <MigrateSystemIndicesStep setIsComplete={setIsComplete} />
      </>
    ),
  };
};
