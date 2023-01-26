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
import { endpointActionResponseCodes } from '../endpoint_responder/lib/endpoint_action_response_codes';
import type { ActionDetails, MaybeImmutable } from '../../../../common/endpoint/types';

interface EndpointActionFailureMessageProps {
  action: MaybeImmutable<ActionDetails<{ code?: string }>>;
}

export const EndpointActionFailureMessage = memo<EndpointActionFailureMessageProps>(
  ({ action }) => {
    return useMemo(() => {
      if (!action.isCompleted || action.wasSuccessful) {
        return null;
      }

      const errors: React.ReactNode[] = [];

      // Determine if each endpoint returned a response code and if so,
      // see if we have a localized message for it
      if (action.outputs) {
        for (const agent of action.agents) {
          const endpointAgentOutput = action.outputs[agent];

          if (
            endpointAgentOutput &&
            endpointAgentOutput.type === 'json' &&
            endpointAgentOutput.content.code &&
            endpointActionResponseCodes[endpointAgentOutput.content.code]
          ) {
            errors.push(endpointActionResponseCodes[endpointAgentOutput.content.code]);
          }
        }
      }

      if (!errors.length) {
        if (action.errors) {
          errors.push(...action.errors);
        } else {
          errors.push(
            i18n.translate('xpack.securitySolution.endpointActionFailureMessage.unknownFailure', {
              defaultMessage: 'Action failed',
            })
          );
        }
      }

      return (
        <>
          <FormattedMessage
            id="xpack.securitySolution.endpointResponseActions.actionError.errorMessage"
            defaultMessage="The following { errorCount, plural, =1 {error was} other {errors were}} encountered:"
            values={{ errorCount: errors.length }}
          />
          <EuiSpacer size="s" />
          <>
            {errors.map((error) => (
              <div>{error}</div>
            ))}
          </>
        </>
      );
    }, [action]);
  }
);
EndpointActionFailureMessage.displayName = 'EndpointActionFailureMessage';
