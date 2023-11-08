/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactNode } from 'react';
import React from 'react';
import { EuiText, EuiTitle, EuiSpacer, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EnabledAutomatedResponseActionsCommands } from '../../../../common/endpoint/service/response_actions/constants';

interface EndpointActionTextProps {
  name: EnabledAutomatedResponseActionsCommands;
  isDisabled: boolean;
}

const EndpointActionTextComponent = ({ name, isDisabled }: EndpointActionTextProps) => {
  const { title, description, tooltip } = useGetCommandText(name);

  const content = (
    <>
      <EuiTitle size="xs">
        <EuiText>{title}</EuiText>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText>{description}</EuiText>
    </>
  );
  if (isDisabled) {
    return (
      <EuiToolTip position="top" content={tooltip}>
        {content}
      </EuiToolTip>
    );
  }
  return content;
};

const useGetCommandText = (
  name: EndpointActionTextProps['name']
): { title: ReactNode; description: ReactNode; tooltip: ReactNode } => {
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
        tooltip: (
          <FormattedMessage
            id="xpack.securitySolution.responseActions.endpoint.isolateTooltip"
            defaultMessage="Insufficient privileges to isolate hosts. Contact your Kibana administrator if you think you should have this permission."
          />
        ),
      };
    default:
      return {
        title: '',
        description: '',
        tooltip: '',
      };
  }
};

export const EndpointActionText = React.memo(EndpointActionTextComponent);
