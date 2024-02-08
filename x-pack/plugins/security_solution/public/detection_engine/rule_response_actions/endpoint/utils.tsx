/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactNode } from 'react';
import React from 'react';
import { EuiText, EuiSpacer, EuiToolTip } from '@elastic/eui';
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
      <EuiText size="s">
        <b>{title}</b>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText size="xs">{description}</EuiText>
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
    case 'kill-process':
      return {
        title: (
          <FormattedMessage
            id="xpack.securitySolution.responseActions.endpoint.killProcess"
            defaultMessage="Kill process"
          />
        ),
        description: (
          <FormattedMessage
            id="xpack.securitySolution.responseActions.endpoint.killProcessDescription"
            defaultMessage="Kill/terminate a process"
          />
        ),
        tooltip: (
          <FormattedMessage
            id="xpack.securitySolution.responseActions.endpoint.killProcessTooltip"
            defaultMessage="Insufficient privileges to kill process. Contact your Kibana administrator if you think you should have this permission."
          />
        ),
      };
    case 'suspend-process':
      return {
        title: (
          <FormattedMessage
            id="xpack.securitySolution.responseActions.endpoint.suspendProcess"
            defaultMessage="Suspend process"
          />
        ),
        description: (
          <FormattedMessage
            id="xpack.securitySolution.responseActions.endpoint.suspendProcessDescription"
            defaultMessage="Temporarily suspend a process"
          />
        ),
        tooltip: (
          <FormattedMessage
            id="xpack.securitySolution.responseActions.endpoint.suspendProcessTooltip"
            defaultMessage="Insufficient privileges to supend process. Contact your Kibana administrator if you think you should have this permission."
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
