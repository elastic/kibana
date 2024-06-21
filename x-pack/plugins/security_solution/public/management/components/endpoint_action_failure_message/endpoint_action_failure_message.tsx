/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { endpointActionResponseCodes } from '../endpoint_responder/lib/endpoint_action_response_codes';
import type { ActionDetails, MaybeImmutable } from '../../../../common/endpoint/types';

interface EndpointActionFailureMessageProps {
  action: MaybeImmutable<ActionDetails>;
  'data-test-subj'?: string;
}

export const EndpointActionFailureMessage = memo<EndpointActionFailureMessageProps>(
  ({ action, 'data-test-subj': dataTestSubj }) => {
    return useMemo(() => {
      if (!action.isCompleted || action.wasSuccessful) {
        return null;
      }

      const errors: string[] = [];

      // Determine if each endpoint returned a response code and if so,
      // see if we have a localized message for it
      // if there are multiple agents, we need to show the outputs/error message for each agent
      if (action.outputs || (action.errors && action.errors.length)) {
        for (const agent of action.agents) {
          const endpointAgentOutput = action.outputs?.[agent];
          const agentState = action.agentState[agent];
          const hasErrors = agentState && agentState.errors;
          const hasOutputCode: boolean =
            !!endpointAgentOutput &&
            endpointAgentOutput.type === 'json' &&
            !!endpointAgentOutput.content &&
            !!endpointAgentOutput.content.code &&
            !!endpointActionResponseCodes[endpointAgentOutput.content.code];

          if (action.agents.length > 1) {
            let errorInfo = `${action.hosts[agent].name}:`;

            if (hasOutputCode && endpointAgentOutput) {
              errorInfo = errorInfo.concat(
                `${endpointActionResponseCodes[endpointAgentOutput.content.code]}`
              );
            }

            if (hasErrors) {
              const errorMessages = [...new Set(agentState.errors)];
              errorInfo = hasOutputCode
                ? errorInfo.concat(` | ${errorMessages}`)
                : errorInfo.concat(`${errorMessages}`);
            }

            errors.push(errorInfo);
          } else {
            if (endpointAgentOutput) {
              errors.push(
                `${endpointActionResponseCodes[endpointAgentOutput.content.code]} | ${[
                  ...new Set(action.errors),
                ]}`
              );
            }
          }
        }
      }

      if (!errors.length) {
        return null;
      }

      return (
        <div data-test-subj={dataTestSubj}>
          <FormattedMessage
            id="xpack.securitySolution.endpointResponseActions.actionError.errorMessage"
            defaultMessage="The following { errorCount, plural, =1 {error was} other {errors were}} encountered:"
            values={{ errorCount: errors.length }}
          />
          <EuiSpacer size="s" />
          <div>{errors.join('\n\n')}</div>
        </div>
      );
    }, [
      action.agentState,
      action.agents,
      action.errors,
      action.hosts,
      action.isCompleted,
      action.outputs,
      action.wasSuccessful,
      dataTestSubj,
    ]);
  }
);
EndpointActionFailureMessage.displayName = 'EndpointActionFailureMessage';
