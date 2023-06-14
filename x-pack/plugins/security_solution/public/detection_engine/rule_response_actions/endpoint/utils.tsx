/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactNode } from 'react';
import React from 'react';
import { EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../common/lib/kibana';

interface EndpointActionTextProps {
  name: 'command' | 'comment' | 'isolate';
}

const EndpointActionTextComponent = ({ name }: EndpointActionTextProps) => {
  const { title, description } = useGetCommandText(name);
  return (
    <>
      <EuiTitle size={'xxs'}>
        <EuiText size={'s'}>{title}</EuiText>
      </EuiTitle>
      <EuiSpacer size={'s'} />
      <EuiText size={'s'}>{description}</EuiText>
      <EuiSpacer size={'s'} />
    </>
  );
};

const LEARN_MORE = i18n.translate(
  'xpack.securitySolution.responseActions.endpoint.commentLearnMore',
  {
    defaultMessage: 'Learn more',
  }
);

const useGetCommandText = (
  name: EndpointActionTextProps['name']
): { title: ReactNode; description: ReactNode } => {
  const {
    docLinks: {
      links: {
        securitySolution: { responseActions },
      },
    },
  } = useKibana().services;

  switch (name) {
    case 'command':
      return {
        title: (
          <FormattedMessage
            id="xpack.securitySolution.responseActions.endpoint.commentLabel"
            defaultMessage="Response action"
          />
        ),
        description: (
          <FormattedMessage
            id="xpack.securitySolution.responseActions.endpoint.commentDescription"
            defaultMessage="Select an Endpoint response action. The response action only runs on hosts with Elastic Defend installed. {docs}"
            values={{
              docs: (
                <EuiLink href={responseActions} target="_blank">
                  {LEARN_MORE}
                </EuiLink>
              ),
            }}
          />
        ),
      };
    case 'comment':
      return {
        title: (
          <FormattedMessage
            id="xpack.securitySolution.responseActions.endpoint.commentLabel"
            defaultMessage="Comment (optional)"
          />
        ),
        description: (
          <FormattedMessage
            id="xpack.securitySolution.responseActions.endpoint.commentDescription"
            defaultMessage="Leave a note that explains or describes the action. You can see your comment in Response action history log."
          />
        ),
      };
    case 'isolate':
      return {
        title: (
          <FormattedMessage
            id="xpack.securitySolution.responseActions.endpoint.commandLabel"
            defaultMessage="Isolate"
          />
        ),
        description: (
          <FormattedMessage
            id="xpack.securitySolution.responseActions.endpoint.commandDescription"
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
