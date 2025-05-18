/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/css';
import { EuiText, EuiTextColor } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { IntegrationToolComponentProps } from '@kbn/wci-browser';

const bold = css`
  font-weight: bold;
  font-style: normal;
`;

const italic = css`
  font-style: italic;
`;

export const IndexSourceTool: React.FC<IntegrationToolComponentProps> = ({
  integration,
  toolCall,
  toolResult,
}) => {
  const integrationNode = (
    <EuiTextColor className={bold} color="success">
      {integration.name}
    </EuiTextColor>
  );
  const argsNode = (
    <EuiTextColor className={bold} color="accent">
      &quot;{toolCall.args.query}&quot;
    </EuiTextColor>
  );

  if (toolResult) {
    return (
      <EuiText size="s" className={italic}>
        <FormattedMessage
          id="xpack.workchatApp.wci_index_source.chat.toolCall.calledToolLabel"
          defaultMessage="searched for {args} using index source {integration}."
          values={{
            integration: integrationNode,
            args: argsNode,
          }}
        />
      </EuiText>
    );
  } else {
    return (
      <EuiText size="s" className={italic}>
        <FormattedMessage
          id="xpack.workchatApp.wci_index_source.chat.toolCall.callingToolLabel"
          defaultMessage="is searching for {args} using index source {integration}."
          values={{
            integration: integrationNode,
            args: argsNode,
          }}
        />
      </EuiText>
    );
  }
};
