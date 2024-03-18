/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiText,
  EuiSpacer,
  EuiLink,
  EuiLoadingSpinner,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  formatDate,
  EuiDescriptionList,
  EuiSkeletonText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { getFlattenedObject } from '@kbn/std';
import omit from 'lodash/omit';
import type { SearchHit } from '@kbn/es-types';

import styled from 'styled-components';

import { useStartServices, useIsGuidedOnboardingActive } from '../../../../../../../hooks';

import type { PackageInfo } from '../../../../../../../../common';

import {
  useGetAgentIncomingData,
  usePollingIncomingData,
} from '../../../../../../../components/agent_enrollment_flyout/use_get_agent_incoming_data';

import { ConfirmIncomingDataTimeout } from './confirm_incoming_data_timeout';

interface Props {
  agentIds: string[];
  packageInfo?: PackageInfo;
  agentDataConfirmed: boolean;
  setAgentDataConfirmed: (v: boolean) => void;
  troubleshootLink: string;
}
const MAX_AGENT_DATA_PREVIEW_COUNT = 5;
// make room for more interesting keys in the UI
const DATA_PREVIEW_OMIT_KEYS = [
  'agent.ephemeral_id',
  'agent.id',
  'elastic_agent.id',
  'data_stream.namespace',
  '@timestamp',
];

const CleanOverflowDescriptionList = styled(EuiDescriptionList)`
  overflow: hidden;
  max-height: 125px;
  word-break: break-all;
  white-space: pre-wrap;
`;

// &&& increases the style priority
const CompressedPre = styled('pre')`
  &&& {
    background: none;
    padding: 0 0;
  }
`;

const HitPreview: React.FC<{ hit: SearchHit }> = ({ hit }) => {
  const hitForDisplay = omit(
    getFlattenedObject(hit._source as Record<string, unknown>),
    DATA_PREVIEW_OMIT_KEYS
  );
  const listItems = Object.entries(hitForDisplay).map(([key, value]) => ({
    title: `${key}:`,
    // Ensures arrays and collections of nested objects are displayed correctly
    description: JSON.stringify(value),
  }));

  return (
    <pre>
      <code>
        <CleanOverflowDescriptionList listItems={listItems} type="inline" align="left" compressed />
      </code>
    </pre>
  );
};

const HitTimestamp: React.FC<{ hit: SearchHit }> = ({ hit }) => {
  const source = (hit?._source as Record<string, any>) || {};
  const timestamp = source?.['@timestamp'] || '-';
  return (
    <EuiText size={'xs'}>
      <CompressedPre>
        {timestamp ? formatDate(timestamp, 'MMM D, YYYY @ HH:mm:ss.SSS') : '-'}
      </CompressedPre>
    </EuiText>
  );
};

const AgentDataPreview: React.FC<{ dataPreview: SearchHit[] }> = ({ dataPreview }) => {
  const previewData = dataPreview.slice(0, MAX_AGENT_DATA_PREVIEW_COUNT);
  return (
    <>
      {previewData.map((hit) => (
        <div id={hit._id}>
          <EuiFlexGroup gutterSize={'xs'}>
            <EuiFlexItem style={{ minWidth: '220px' }}>
              <HitTimestamp hit={hit} />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <HitPreview hit={hit} />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiHorizontalRule margin="s" />
        </div>
      ))}
    </>
  );
};

export const ConfirmIncomingDataWithPreview: React.FunctionComponent<Props> = ({
  agentIds,
  packageInfo,
  agentDataConfirmed,
  setAgentDataConfirmed,
  troubleshootLink,
}) => {
  const { incomingData, dataPreview, isLoading, hasReachedTimeout } = usePollingIncomingData(
    agentIds,
    true,
    MAX_AGENT_DATA_PREVIEW_COUNT
  );
  const { enrolledAgents, numAgentsWithData } = useGetAgentIncomingData(incomingData, packageInfo);

  const isGuidedOnboardingActive = useIsGuidedOnboardingActive(packageInfo?.name);
  const { guidedOnboarding } = useStartServices();
  if (!isLoading && enrolledAgents > 0 && numAgentsWithData > 0) {
    setAgentDataConfirmed(true);
    if (isGuidedOnboardingActive) {
      guidedOnboarding?.guidedOnboardingApi?.completeGuidedOnboardingForIntegration(
        packageInfo?.name
      );
    }
  }
  if (!agentDataConfirmed) {
    return (
      <>
        <EuiText>
          <EuiCallOut
            size="m"
            color="primary"
            iconType={EuiLoadingSpinner}
            title={
              <FormattedMessage
                id="xpack.fleet.confirmIncomingDataWithPreview.listening"
                defaultMessage="Listening for incoming data from enrolled agents..."
              />
            }
          />
          <EuiSpacer size="m" />
          {hasReachedTimeout ? (
            <ConfirmIncomingDataTimeout
              agentIds={agentIds}
              troubleshootLink={troubleshootLink}
              packageInfo={packageInfo}
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.confirmIncomingDataWithPreview.loading"
              defaultMessage="It might take a few minutes for the data to get to Elasticsearch. If you're not seeing any, try generating some to verify. If you're having trouble connecting, check out the {link}."
              values={{
                link: (
                  <EuiLink target="_blank" external href={troubleshootLink}>
                    <FormattedMessage
                      id="xpack.fleet.enrollmentInstructions.troubleshootingLink"
                      defaultMessage="troubleshooting guide"
                    />
                  </EuiLink>
                ),
              }}
            />
          )}
        </EuiText>
        <EuiSpacer size="m" />
        <EuiSkeletonText lines={10} />
      </>
    );
  }

  return (
    <>
      <EuiCallOut
        data-test-subj="IncomingDataConfirmedCallOut"
        title={i18n.translate('xpack.fleet.confirmIncomingDataWithPreview.title', {
          defaultMessage:
            'Incoming data received from {numAgentsWithData} enrolled { numAgentsWithData, plural, one {agent} other {agents}}.',
          values: {
            numAgentsWithData,
          },
        })}
        color="success"
        iconType="check"
      />
      <EuiSpacer size="m" />
      <EuiText>
        <h3>
          <FormattedMessage
            id="xpack.fleet.confirmIncomingDataWithPreview.previewTitle"
            defaultMessage="Preview of incoming data:"
          />
        </h3>
      </EuiText>
      <EuiSpacer size="m" />
      <AgentDataPreview dataPreview={dataPreview} />
    </>
  );
};
