/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { memo } from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import { EndpointActionFailureMessage } from '../endpoint_action_failure_message';
import type {
  ActionDetails,
  ResponseActionUploadOutputContent,
  ResponseActionUploadParameters,
} from '../../../../common/endpoint/types';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';

interface EndpointUploadActionResultProps {
  action: ActionDetails<ResponseActionUploadOutputContent, ResponseActionUploadParameters>;
  /** The agent id to display the result for. If undefined, the first agent will be used */
  agentId?: string;
  'data-test-subj'?: string;
}

const LABELS = Object.freeze<Record<string, string>>({
  path: i18n.translate('xpack.securitySolution.uploadActionResult.savedTo', {
    defaultMessage: 'File saved to',
  }),

  disk_free_space: i18n.translate('xpack.securitySolution.uploadActionResult.freeDiskSpace', {
    defaultMessage: 'Free disk space on drive',
  }),

  noAgentResponse: i18n.translate('xpack.securitySolution.uploadActionResult.missingAgentResult', {
    defaultMessage: 'Error: Agent result missing',
  }),
});

export const EndpointUploadActionResult = memo<EndpointUploadActionResultProps>(
  ({ action, agentId, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    const agentState = action?.agentState[agentId ?? action.agents[0]];
    const agentResult = action?.outputs?.[agentId ?? action.agents[0]];

    if (action.command !== 'upload') {
      return null;
    }

    // Use case: action log
    if (!agentState.isCompleted) {
      return (
        <div data-test-subj={getTestId('pending')}>
          <FormattedMessage
            id="xpack.securitySolution.uploadActionResult.pendingMessage"
            defaultMessage="Action pending."
          />
        </div>
      );
    }

    // if we don't have an agent result (for whatever reason)
    if (!agentResult) {
      return <div data-test-subj={getTestId('noResultError')}>{LABELS.noAgentResponse}</div>;
    }

    // Error result
    if (!agentState.wasSuccessful) {
      return (
        <EndpointActionFailureMessage
          action={action as ActionDetails}
          data-test-subj={getTestId('error')}
        />
      );
    }

    return (
      <div data-test-subj={getTestId('success')}>
        <KeyValueDisplay name={LABELS.path} value={agentResult.content.path} />
        <KeyValueDisplay
          name={LABELS.disk_free_space}
          value={numeral(agentResult.content.disk_free_space).format('0.00b')}
        />
      </div>
    );
  }
);
EndpointUploadActionResult.displayName = 'EndpointUploadActionResult';

export interface KeyValueDisplayProps {
  name: string;
  value: string;
}
const KeyValueDisplay = memo<KeyValueDisplayProps>(({ name, value }) => {
  return (
    <EuiText className="eui-textBreakWord" size="s">
      <strong>
        {name}
        {': '}
      </strong>
      {value}
    </EuiText>
  );
});
KeyValueDisplay.displayName = 'KeyValueDisplay';
