/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState, useEffect } from 'react';

import { EuiText, EuiFlexItem, EuiFlexGroup, EuiSpacer, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';

import { DEPRECATION_LOGS_INDEX } from '../../../../../common/constants';
import { WithPrivileges } from '../../../../shared_imports';
import type { OverviewStepProps } from '../../types';
import { EsDeprecationIssuesPanel, KibanaDeprecationIssuesPanel } from './components';

const i18nTexts = {
  reviewStepTitle: i18n.translate('xpack.upgradeAssistant.overview.fixIssuesStepTitle', {
    defaultMessage: 'Review deprecated settings and resolve issues',
  }),
};

interface Props {
  setIsComplete: OverviewStepProps['setIsComplete'];
}

const FixIssuesStep: FunctionComponent<Props> = ({ setIsComplete }) => {
  // We consider ES and Kibana issues to be fixed when there are 0 critical issues.
  const [isEsFixed, setIsEsFixed] = useState(false);
  const [isKibanaFixed, setIsKibanaFixed] = useState(false);

  useEffect(() => {
    setIsComplete(isEsFixed && isKibanaFixed);
    // Depending upon setIsComplete would create an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEsFixed, isKibanaFixed]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EsDeprecationIssuesPanel setIsFixed={setIsEsFixed} />
      </EuiFlexItem>

      <EuiFlexItem>
        <KibanaDeprecationIssuesPanel setIsFixed={setIsKibanaFixed} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface CustomProps {
  navigateToEsDeprecationLogs: () => void;
}

const AccessDeprecationLogsMessage = ({ navigateToEsDeprecationLogs }: CustomProps) => {
  return (
    <WithPrivileges privileges={`index.${DEPRECATION_LOGS_INDEX}`}>
      {({ hasPrivileges, isLoading }) => {
        if (isLoading || !hasPrivileges) {
          // Don't show the message with the link to access deprecation logs
          // to users who can't access the UI anyways.
          return null;
        }

        return (
          <FormattedMessage
            id="xpack.upgradeAssistant.overview.accessEsDeprecationLogsLabel"
            defaultMessage="If you have application code that calls Elasticsearch APIs, review the {esDeprecationLogsLink} to make sure you are not using deprecated APIs."
            values={{
              esDeprecationLogsLink: (
                <EuiLink
                  onClick={navigateToEsDeprecationLogs}
                  data-test-subj="viewElasticsearchDeprecationLogs"
                >
                  {i18n.translate('xpack.upgradeAssistant.overview.esDeprecationLogsLink', {
                    defaultMessage: 'Elasticsearch deprecation logs',
                  })}
                </EuiLink>
              ),
            }}
          />
        );
      }}
    </WithPrivileges>
  );
};

export const getFixIssuesStep = ({
  isComplete,
  setIsComplete,
  navigateToEsDeprecationLogs,
}: OverviewStepProps & CustomProps): EuiStepProps => {
  const status = isComplete ? 'complete' : 'incomplete';

  return {
    title: i18nTexts.reviewStepTitle,
    status,
    'data-test-subj': `fixIssuesStep-${status}`,
    children: (
      <>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.overview.fixIssuesStepDescription"
              defaultMessage="You must resolve any critical Elasticsearch and Kibana configuration issues before upgrading to Elastic 8.x. Ignoring warnings might result in differences in behavior after you upgrade. {accessDeprecationLogsMessage}"
              values={{
                accessDeprecationLogsMessage: (
                  <AccessDeprecationLogsMessage
                    navigateToEsDeprecationLogs={navigateToEsDeprecationLogs}
                  />
                ),
              }}
            />
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <FixIssuesStep setIsComplete={setIsComplete} />
      </>
    ),
  };
};
