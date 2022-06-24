/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiLink, EuiText } from '@elastic/eui';
import styled from 'styled-components';

import { FormattedMessage } from '@kbn/i18n-react';

const HelpTextWarningContainer = styled.div`
  margin-top: 10px;
`;

const HelpTextComponent: React.FC<{ href: string; notRunningJobIds: string[] }> = ({
  href,
  notRunningJobIds,
}) => (
  <>
    <FormattedMessage
      id="xpack.securitySolution.detectionEngine.createRule.stepDefineRule.machineLearningJobIdHelpText"
      defaultMessage="We've provided a few common jobs to get you started. To add your own custom jobs, assign a group of 'security' to those jobs in the {machineLearning} application to make them appear here."
      values={{
        machineLearning: (
          <EuiLink href={href} target="_blank">
            <FormattedMessage
              id="xpack.securitySolution.components.mlJobSelect.machineLearningLink"
              defaultMessage="Machine Learning"
            />
          </EuiLink>
        ),
      }}
    />
    {notRunningJobIds.length > 0 && (
      <HelpTextWarningContainer data-test-subj="ml-warning-not-running-jobs">
        <EuiText size="xs" color="warning">
          <EuiIcon type="alert" />
          <span>
            {notRunningJobIds.length === 1 ? (
              <FormattedMessage
                id="xpack.securitySolution.detectionEngine.createRule.stepDefineRule.mlEnableJobSingle"
                defaultMessage="The selected ML job, {jobName}, is not currently running. Please set {jobName} to run via 'ML job settings' before enabling this rule."
                values={{
                  jobName: notRunningJobIds[0],
                }}
              />
            ) : (
              <FormattedMessage
                id="xpack.securitySolution.detectionEngine.createRule.stepDefineRule.mlEnableJobMulti"
                defaultMessage="The selected ML jobs, {jobNames}, are not currently running. Please set all of these jobs to run via 'ML job settings' before enabling this rule."
                values={{
                  jobNames: notRunningJobIds.reduce(
                    (acc, value, i, array) => acc + (i < array.length - 1 ? ', ' : ', and ') + value
                  ),
                }}
              />
            )}
          </span>
        </EuiText>
      </HelpTextWarningContainer>
    )}
  </>
);

export const HelpText = React.memo(HelpTextComponent);
