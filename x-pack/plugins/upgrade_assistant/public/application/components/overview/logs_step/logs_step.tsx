/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import {
  EuiText,
  EuiSpacer,
  EuiButton,
  EuiCallOut,
  EuiLoadingContent,
  EuiCode,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedTime, FormattedMessage } from '@kbn/i18n-react';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';

import { DEPRECATION_LOGS_INDEX } from '../../../../../common/constants';
import { WithPrivileges, MissingPrivileges } from '../../../../shared_imports';
import { useAppContext } from '../../../app_context';
import { loadLogsCheckpoint } from '../../../lib/logs_checkpoint';
import type { OverviewStepProps } from '../../types';
import { useDeprecationLogging } from '../../es_deprecation_logs';

const i18nTexts = {
  logsStepTitle: i18n.translate('xpack.upgradeAssistant.overview.logsStep.title', {
    defaultMessage: 'Address API deprecations',
  }),
  logsStepDescription: i18n.translate('xpack.upgradeAssistant.overview.logsStep.description', {
    defaultMessage: `Review the Elasticsearch deprecation logs to ensure you're not using deprecated APIs.`,
  }),
  viewLogsButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.logsStep.viewLogsButtonLabel',
    {
      defaultMessage: 'View logs',
    }
  ),
  enableLogsButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.logsStep.enableLogsButtonLabel',
    {
      defaultMessage: 'Enable logging',
    }
  ),
  logsCountDescription: (deprecationCount: number, checkpoint: string) => (
    <FormattedMessage
      id="xpack.upgradeAssistant.overview.logsStep.countDescription"
      defaultMessage="You have {deprecationCount, plural, =0 {no} other {{deprecationCount}}} deprecation {deprecationCount, plural, one {issue} other {issues}} since {checkpoint}."
      values={{
        deprecationCount,
        checkpoint: (
          <>
            <FormattedDate value={checkpoint} year="numeric" month="long" day="2-digit" />{' '}
            <FormattedTime value={checkpoint} timeZoneName="short" hour12={false} />
          </>
        ),
      }}
    />
  ),
  missingPrivilegesTitle: i18n.translate(
    'xpack.upgradeAssistant.overview.logsStep.missingPrivilegesTitle',
    {
      defaultMessage: 'You require index privileges to analyze the deprecation logs',
    }
  ),
  missingPrivilegesDescription: (privilegesMissing: MissingPrivileges) => (
    <FormattedMessage
      id="xpack.upgradeAssistant.overview.logsStep.missingPrivilegesDescription"
      defaultMessage="The deprecation logs will continue to be indexed, but you won't be able to analyze them until you have the read index {privilegesCount, plural, one {privilege} other {privileges}} for: {missingPrivileges}"
      values={{
        missingPrivileges: (
          <EuiCode transparentBackground={true}>{privilegesMissing?.index?.join(', ')}</EuiCode>
        ),
        privilegesCount: privilegesMissing?.index?.length,
      }}
    />
  ),
  loadingError: i18n.translate('xpack.upgradeAssistant.overview.logsStep.loadingError', {
    defaultMessage: 'An error occurred while retrieving the deprecation log count',
  }),
  retryButton: i18n.translate('xpack.upgradeAssistant.overview.logsStep.retryButton', {
    defaultMessage: 'Try again',
  }),
};

interface LogStepProps {
  setIsComplete: (isComplete: boolean) => void;
  hasPrivileges: boolean;
  privilegesMissing: MissingPrivileges;
  navigateToEsDeprecationLogs: () => void;
}

const LogStepDescription = () => (
  <EuiText>
    <p>{i18nTexts.logsStepDescription}</p>
  </EuiText>
);

const LogsStep = ({
  setIsComplete,
  hasPrivileges,
  privilegesMissing,
  navigateToEsDeprecationLogs,
}: LogStepProps) => {
  const {
    services: { api },
  } = useAppContext();

  const { isDeprecationLogIndexingEnabled } = useDeprecationLogging();

  const checkpoint = loadLogsCheckpoint();

  const {
    data: logsCount,
    error,
    isLoading,
    resendRequest,
    isInitialRequest,
  } = api.getDeprecationLogsCount(checkpoint);

  useEffect(() => {
    if (!isDeprecationLogIndexingEnabled) {
      setIsComplete(false);
    }

    setIsComplete(logsCount?.count === 0);

    // Depending upon setIsComplete would create an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDeprecationLogIndexingEnabled, logsCount]);

  if (hasPrivileges === false && isDeprecationLogIndexingEnabled) {
    return (
      <>
        <LogStepDescription />

        <EuiSpacer />

        <EuiCallOut
          iconType="help"
          color="warning"
          title={i18nTexts.missingPrivilegesTitle}
          data-test-subj="missingPrivilegesCallout"
        >
          <p>{i18nTexts.missingPrivilegesDescription(privilegesMissing)}</p>
        </EuiCallOut>
      </>
    );
  }

  if (isLoading && isInitialRequest) {
    return <EuiLoadingContent lines={3} />;
  }

  if (hasPrivileges && error) {
    return (
      <EuiCallOut
        title={i18nTexts.loadingError}
        color="danger"
        iconType="alert"
        data-test-subj="deprecationLogsErrorCallout"
      >
        <p>
          {error.statusCode} - {error.message}
        </p>

        <EuiButton
          color="danger"
          onClick={resendRequest}
          data-test-subj="deprecationLogsRetryButton"
        >
          {i18nTexts.retryButton}
        </EuiButton>
      </EuiCallOut>
    );
  }

  return (
    <>
      <LogStepDescription />

      {isDeprecationLogIndexingEnabled && logsCount ? (
        <>
          <EuiSpacer />

          <EuiText>
            <p data-test-subj="logsCountDescription">
              {i18nTexts.logsCountDescription(logsCount.count, checkpoint)}
            </p>
          </EuiText>

          <EuiSpacer />

          <EuiButton onClick={navigateToEsDeprecationLogs} data-test-subj="viewLogsLink">
            {i18nTexts.viewLogsButtonLabel}
          </EuiButton>
        </>
      ) : (
        <>
          <EuiSpacer />

          <EuiButton onClick={navigateToEsDeprecationLogs} data-test-subj="enableLogsLink">
            {i18nTexts.enableLogsButtonLabel}
          </EuiButton>
        </>
      )}
      <EuiSpacer size="m" />
    </>
  );
};

interface CustomProps {
  navigateToEsDeprecationLogs: () => void;
}

export const getLogsStep = ({
  isComplete,
  setIsComplete,
  navigateToEsDeprecationLogs,
}: OverviewStepProps & CustomProps): EuiStepProps => {
  const status = isComplete ? 'complete' : 'incomplete';

  return {
    status,
    title: i18nTexts.logsStepTitle,
    'data-test-subj': `logsStep-${status}`,
    children: (
      <WithPrivileges privileges={`index.${DEPRECATION_LOGS_INDEX}`}>
        {({ hasPrivileges, isLoading, privilegesMissing }) => (
          <LogsStep
            setIsComplete={setIsComplete}
            hasPrivileges={!isLoading && hasPrivileges}
            navigateToEsDeprecationLogs={navigateToEsDeprecationLogs}
            privilegesMissing={privilegesMissing}
          />
        )}
      </WithPrivileges>
    ),
  };
};
