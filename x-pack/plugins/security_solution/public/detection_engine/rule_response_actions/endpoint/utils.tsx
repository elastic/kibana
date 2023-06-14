/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactNode } from 'react';
import React from 'react';
import { EuiText, EuiTitle, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EnabledAutomatedResponseActionsCommands } from '../../../../common/endpoint/service/response_actions/constants';

interface EndpointActionTextProps {
  name: EnabledAutomatedResponseActionsCommands;
}

const EndpointActionTextComponent = ({ name }: EndpointActionTextProps) => {
  const { title, description } = useGetCommandText(name);
  return (
    <>
      <EuiTitle size="xs">
        <EuiText>{title}</EuiText>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText>{description}</EuiText>
    </>
  );
};

const useGetCommandText = (
  name: EndpointActionTextProps['name']
): { title: ReactNode; description: ReactNode } => {
  switch (name) {
    case 'isolate':
      return {
        title: (
          <FormattedMessage
            id="xpack.securitySolution.responseActions.endpoint.isolate"
            defaultMessage="Isolate"
          />
        ),
        description: (
          <FormattedMessage
            id="xpack.securitySolution.responseActions.endpoint.isolateDescription"
            defaultMessage="Quarantine a host from the network to prevent further spread of threats and limit potential damage"
          />
        ),
      };
    default:
      return {
        title: '',
        description: '',
      };
  }
};

export const EndpointActionText = React.memo(EndpointActionTextComponent);
