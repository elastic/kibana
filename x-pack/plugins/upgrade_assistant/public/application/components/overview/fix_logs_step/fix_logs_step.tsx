/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FunctionComponent, useState, useEffect } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiText, EuiSpacer, EuiLink, EuiCallOut, EuiCode } from '@elastic/eui';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';

import { useAppContext } from '../../../app_context';
import { ExternalLinks } from './external_links';
import { DeprecationsCountCheckpoint } from './deprecations_count_checkpoint';
import { useDeprecationLogging } from './use_deprecation_logging';
import { DeprecationLoggingToggle } from './deprecation_logging_toggle';
import { loadLogsCheckpoint, saveLogsCheckpoint } from '../../../lib/logs_checkpoint';
import type { OverviewStepProps } from '../../types';
import { DEPRECATION_LOGS_INDEX } from '../../../../../common/constants';
import { WithPrivileges, MissingPrivileges } from '../../../../shared_imports';

const i18nTexts = {
  identifyStepTitle: i18n.translate('xpack.upgradeAssistant.overview.identifyStepTitle', {
    defaultMessage: 'Identify deprecated API use and update your applications',
  }),
  analyzeTitle: i18n.translate('xpack.upgradeAssistant.overview.analyzeTitle', {
    defaultMessage: 'Analyze deprecation logs',
  }),
  deprecationsCountCheckpointTitle: i18n.translate(
    'xpack.upgradeAssistant.overview.deprecationsCountCheckpointTitle',
    {
      defaultMessage: 'Resolve deprecation issues and verify your changes',
    }
  ),
  apiCompatibilityNoteTitle: i18n.translate(
    'xpack.upgradeAssistant.overview.apiCompatibilityNoteTitle',
    {
      defaultMessage: 'Apply API compatibility headers (optional)',
    }
  ),
  apiCompatibilityNoteBody: (docLink: string) => (
    <FormattedMessage
      id="xpack.upgradeAssistant.overview.apiCompatibilityNoteBody"
      defaultMessage="We recommend you resolve all deprecation issues before upgrading. However, it can be challenging to ensure all requests are fixed. For additional safety, include API version compatibility headers in your requests. {learnMoreLink}."
      values={{
        learnMoreLink: (
          <EuiLink href={docLink} target="_blank">
            <FormattedMessage
              id="xpack.upgradeAssistant.overview.apiCompatibilityNoteLink"
              defaultMessage="Learn more"
            />
          </EuiLink>
        ),
      }}
    />
  ),
  onlyLogWritingEnabledTitle: i18n.translate(
    'xpack.upgradeAssistant.overview.deprecationLogs.deprecationWarningTitle',
    {
      defaultMessage: 'Your logs are being written to the logs directory',
    }
  ),
  onlyLogWritingEnabledBody: i18n.translate(
    'xpack.upgradeAssistant.overview.deprecationLogs.deprecationWarningBody',
    {
      defaultMessage:
        'Go to your logs directory to view the deprecation logs or enable log collecting to see them in the UI.',
    }
  ),
  deniedPrivilegeTitle: i18n.translate(
    'xpack.upgradeAssistant.overview.deprecationLogs.deniedPrivilegeTitle',
    {
      defaultMessage: 'You require index privileges to analyze the deprecation logs',
    }
  ),
  deniedPrivilegeDescription: (privilegesMissing: MissingPrivileges) => (
    // NOTE: hardcoding the missing privilege because the WithPrivileges HOC
    // doesnt provide a way to retrieve which specific privileges an index
    // is missing.
    <FormattedMessage
      id="xpack.upgradeAssistant.overview.deprecationLogs.deniedPrivilegeDescription"
      defaultMessage="The deprecation logs will continue to be indexed, but you won't be able to analyze them until you have the read index {privilegesCount, plural, one {privilege} other {privileges}} for: {missingPrivileges}"
      values={{
        missingPrivileges: (
          <EuiCode transparentBackground={true}>{privilegesMissing?.index?.join(', ')}</EuiCode>
        ),
        privilegesCount: privilegesMissing?.index?.length,
      }}
    />
  ),
};

interface Props {
  setIsComplete: OverviewStepProps['setIsComplete'];
  hasPrivileges: boolean;
  privilegesMissing: MissingPrivileges;
}

const FixLogsStep: FunctionComponent<Props> = ({
  setIsComplete,
  hasPrivileges,
  privilegesMissing,
}) => {
  const {
    services: {
      core: { docLinks },
    },
  } = useAppContext();

  const {
    isDeprecationLogIndexingEnabled,
    onlyDeprecationLogWritingEnabled,
    isLoading,
    isUpdating,
    fetchError,
    updateError,
    resendRequest,
    toggleLogging,
  } = useDeprecationLogging();

  const [checkpoint, setCheckpoint] = useState(loadLogsCheckpoint());

  useEffect(() => {
    saveLogsCheckpoint(checkpoint);
  }, [checkpoint]);

  useEffect(() => {
    if (!isDeprecationLogIndexingEnabled) {
      setIsComplete(false);
    }

    // Depending upon setIsComplete would create an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDeprecationLogIndexingEnabled]);

  return (
    <>
      <DeprecationLoggingToggle
        isDeprecationLogIndexingEnabled={isDeprecationLogIndexingEnabled}
        isLoading={isLoading}
        isUpdating={isUpdating}
        fetchError={fetchError}
        updateError={updateError}
        resendRequest={resendRequest}
        toggleLogging={toggleLogging}
      />

      {onlyDeprecationLogWritingEnabled && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            title={i18nTexts.onlyLogWritingEnabledTitle}
            color="warning"
            iconType="help"
            data-test-subj="deprecationWarningCallout"
          >
            <p>{i18nTexts.onlyLogWritingEnabledBody}</p>
          </EuiCallOut>
        </>
      )}

      {!hasPrivileges && isDeprecationLogIndexingEnabled && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            iconType="help"
            color="warning"
            title={i18nTexts.deniedPrivilegeTitle}
            data-test-subj="noIndexPermissionsCallout"
          >
            <p>{i18nTexts.deniedPrivilegeDescription(privilegesMissing)}</p>
          </EuiCallOut>
        </>
      )}

      {hasPrivileges && isDeprecationLogIndexingEnabled && (
        <>
          <EuiSpacer size="xl" />
          <EuiText data-test-subj="externalLinksTitle">
            <h4>{i18nTexts.analyzeTitle}</h4>
          </EuiText>
          <EuiSpacer size="m" />
          <ExternalLinks checkpoint={checkpoint} />

          <EuiSpacer size="xl" />
          <EuiText data-test-subj="deprecationsCountTitle">
            <h4>{i18nTexts.deprecationsCountCheckpointTitle}</h4>
          </EuiText>
          <EuiSpacer size="m" />
          <DeprecationsCountCheckpoint
            checkpoint={checkpoint}
            setCheckpoint={setCheckpoint}
            setHasNoDeprecationLogs={setIsComplete}
          />

          <EuiSpacer size="xl" />
          <EuiText data-test-subj="apiCompatibilityNoteTitle">
            <h4>{i18nTexts.apiCompatibilityNoteTitle}</h4>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiText>
            <p>
              {i18nTexts.apiCompatibilityNoteBody(
                docLinks.links.elasticsearch.apiCompatibilityHeader
              )}
            </p>
          </EuiText>
        </>
      )}
    </>
  );
};

export const getFixLogsStep = ({ isComplete, setIsComplete }: OverviewStepProps): EuiStepProps => {
  const status = isComplete ? 'complete' : 'incomplete';

  return {
    status,
    title: i18nTexts.identifyStepTitle,
    'data-test-subj': `fixLogsStep-${status}`,
    children: (
      <WithPrivileges privileges={`index.${DEPRECATION_LOGS_INDEX}`}>
        {({ hasPrivileges, privilegesMissing, isLoading }) => (
          <FixLogsStep
            setIsComplete={setIsComplete}
            hasPrivileges={!isLoading && hasPrivileges}
            privilegesMissing={privilegesMissing}
          />
        )}
      </WithPrivileges>
    ),
  };
};
