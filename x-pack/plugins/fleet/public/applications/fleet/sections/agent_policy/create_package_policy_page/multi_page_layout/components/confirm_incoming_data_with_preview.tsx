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
  EuiLoadingContent,
  EuiLoadingSpinner,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  formatDate,
  EuiDescriptionList,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { getFlattenedObject } from '@kbn/std';
import omit from 'lodash/omit';
import type { SearchHit } from '@kbn/core/types/elasticsearch';

import type { InstalledIntegrationPolicy } from '../../../../../../../components/agent_enrollment_flyout/use_get_agent_incoming_data';
import {
  useGetAgentIncomingData,
  usePollingIncomingData,
} from '../../../../../../../components/agent_enrollment_flyout/use_get_agent_incoming_data';

interface Props {
  agentIds: string[];
  installedPolicy?: InstalledIntegrationPolicy;
  agentDataConfirmed: boolean;
  setAgentDataConfirmed: (v: boolean) => void;
  troubleshootLink: string;
}
const MAX_AGENT_DATA_PREVIEW_COUNT = 10;
// make room for more interesting keys in the UI
const OMIT_KEYS = [
  'agent.ephemeral_id',
  'agent.id',
  'elastic_agent.id',
  'data_stream.namespace',
  '@timestamp',
];
const HitPreview: React.FC<{ hit: SearchHit }> = ({ hit }) => {
  const hitForDisplay = omit(getFlattenedObject(hit._source as Record<string, unknown>), OMIT_KEYS);
  const listItems = Object.entries(hitForDisplay).map(([key, value]) => ({
    title: `${key}:`,
    description: value,
  }));

  return (
    <pre>
      <code>
        <EuiDescriptionList
          style={{
            overflow: 'hidden',
            columnWidth: '350px',
            maxHeight: '120px',
            wordBreak: 'break-all',
            whiteSpace: 'pre-wrap',
          }}
          listItems={listItems}
          type="inline"
          align="left"
          compressed
        />
      </code>
    </pre>
  );
};

const HitTimestamp: React.FC<{ hit: SearchHit }> = ({ hit }) => {
  const source = (hit?._source as Record<string, any>) || {};
  const timestamp = source?.['@timestamp'] || '-';
  return (
    <EuiText size={'xs'}>
      <pre style={{ background: 'none', padding: '0 0' }}>
        {timestamp ? formatDate(timestamp, 'MMM D, YYYY @ HH:mm:ss.SSS') : '-'}
      </pre>
    </EuiText>
  );
};

const AgentDataPreview: React.FC<{ dataPreview: SearchHit[] }> = ({ dataPreview }) => {
  const previewData = dataPreview.slice(0, MAX_AGENT_DATA_PREVIEW_COUNT);
  return (
    <div style={{ maxHeight: '50vh', overflowY: 'scroll' }}>
      {previewData.map((hit, idx) => (
        <div id={hit._id}>
          <EuiFlexGroup gutterSize={'xs'}>
            <EuiFlexItem style={{ minWidth: '220px' }}>
              <HitTimestamp hit={hit} />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <HitPreview hit={hit} />
            </EuiFlexItem>
          </EuiFlexGroup>
          {idx !== previewData.length - 1 && <EuiHorizontalRule margin="s" />}
        </div>
      ))}
    </div>
  );
};

export const ConfirmIncomingDataWithPreview: React.FunctionComponent<Props> = ({
  agentIds,
  installedPolicy,
  agentDataConfirmed,
  setAgentDataConfirmed,
  troubleshootLink,
}) => {
  const { incomingData, dataPreview, isLoading } = usePollingIncomingData(agentIds, true);
  const { enrolledAgents, numAgentsWithData } = useGetAgentIncomingData(
    incomingData,
    installedPolicy
  );

  if (!isLoading && enrolledAgents > 0 && numAgentsWithData > 0) {
    setAgentDataConfirmed(true);
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
          <FormattedMessage
            id="xpack.fleet.confirmIncomingData.loading"
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
        </EuiText>
        <EuiSpacer size="m" />
        <EuiLoadingContent lines={10} />
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
