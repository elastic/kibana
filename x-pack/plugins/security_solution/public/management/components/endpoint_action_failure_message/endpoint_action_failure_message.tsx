/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { getEmptyValue } from '../../../common/components/empty_value';
import { endpointActionResponseCodes } from '../endpoint_responder/lib/endpoint_action_response_codes';
import type { ActionDetails, MaybeImmutable } from '../../../../common/endpoint/types';
import { KeyValueDisplay } from '../key_value_display';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';

const emptyValue = getEmptyValue();

const ERROR_INFO_LABELS = Object.freeze<Record<string, string>>({
  errors: i18n.translate('xpack.securitySolution.endpointActionFailureMessage.errors', {
    defaultMessage: 'Errors',
  }),
  host: i18n.translate('xpack.securitySolution.endpointActionFailureMessage.host', {
    defaultMessage: 'Host',
  }),
});

interface EndpointActionFailureMessageProps {
  action: MaybeImmutable<ActionDetails>;
  'data-test-subj'?: string;
}

// logic for determining agent host/errors info
const getAgentErrors = (action: MaybeImmutable<ActionDetails>) => {
  const allAgentErrors: Array<{ name: string; errors: string[] }> = [];

  if (action.outputs || (action.errors && action.errors.length)) {
    for (const agent of action.agents) {
      const endpointAgentOutput = action.outputs?.[agent];

      const agentState = action.agentState[agent];
      const hasErrors = agentState && agentState.errors;
      const hasOutputCode: boolean =
        !!endpointAgentOutput &&
        endpointAgentOutput.type === 'json' &&
        !!endpointAgentOutput.content &&
        !!endpointAgentOutput.content.code;

      const agentErrorInfo: { name: string; errors: string[] } = { name: '', errors: [] };

      if (
        hasOutputCode &&
        !!endpointAgentOutput &&
        !!endpointActionResponseCodes[endpointAgentOutput.content.code]
      ) {
        agentErrorInfo.errors.push(endpointActionResponseCodes[endpointAgentOutput.content.code]);
      }

      if (hasErrors) {
        const errorMessages: string[] = [...new Set(agentState.errors)];
        agentErrorInfo.errors.push(...errorMessages);
      }

      if (agentErrorInfo.errors.length && action.hosts[agent]?.name) {
        agentErrorInfo.name = action.hosts[agent].name;
      }

      if (agentErrorInfo.errors.length) {
        allAgentErrors.push(agentErrorInfo);
      }
    }
  }

  return allAgentErrors;
};

export const EndpointActionFailureMessage = memo<EndpointActionFailureMessageProps>(
  ({ action, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    return useMemo(() => {
      if (!action.isCompleted || action.wasSuccessful) {
        return null;
      }

      const allAgentErrors = getAgentErrors(action);

      const errorCount = allAgentErrors
        .map((agentErrorInfo) => agentErrorInfo.errors)
        .flat().length;
      const isMultiAgentAction = errorCount && action.agents.length > 1;

      return (
        <div data-test-subj={getTestId('response-action-failure-info')}>
          <FormattedMessage
            id="xpack.securitySolution.endpointResponseActions.actionError.errorMessage"
            defaultMessage="The following { errorCount, plural, =1 {error was} other {errors were}} encountered:"
            values={{ errorCount }}
          />
          <EuiSpacer size="s" />
          <>
            {!errorCount ? (
              <FormattedMessage
                id="xpack.securitySolution.endpointActionFailureMessage.unknownFailure"
                defaultMessage="An unknown error occurred"
              />
            ) : isMultiAgentAction ? (
              allAgentErrors.map((agentErrorInfo) => (
                <div key={agentErrorInfo.name}>
                  <KeyValueDisplay
                    name={ERROR_INFO_LABELS.host}
                    value={agentErrorInfo.name.length ? agentErrorInfo.name : emptyValue}
                  />
                  <KeyValueDisplay
                    name={ERROR_INFO_LABELS.errors}
                    value={agentErrorInfo.errors.join(' | ')}
                  />
                  <EuiSpacer size="s" />
                </div>
              ))
            ) : (
              <>{allAgentErrors[0].errors.join(' | ')}</>
            )}
          </>
        </div>
      );
    }, [action, getTestId]);
  }
);
EndpointActionFailureMessage.displayName = 'EndpointActionFailureMessage';
