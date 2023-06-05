/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  ActionConnectorFieldsProps,
  SecretsFieldSchema,
  SimpleConnectorForm,
  useKibana,
} from '@kbn/triggers-actions-ui-plugin/public';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DocLinksStart } from '@kbn/core/public';
import * as i18n from './translations';

const getSecretsFormSchema = (docLinks: DocLinksStart): SecretsFieldSchema[] => [
  {
    id: 'token',
    label: i18n.TOKEN_LABEL,
    isPasswordField: true,
    helpText: (
      <EuiLink href={docLinks.links.alerting.slackApiAction} target="_blank">
        <FormattedMessage
          id="xpack.stackConnectors.components.slack_api.apiKeyDocumentation"
          defaultMessage="Create a Slack Web API token"
        />
      </EuiLink>
    ),
  },
];

const SlackActionFields: React.FC<ActionConnectorFieldsProps> = ({ readOnly, isEdit }) => {
  const { docLinks } = useKibana().services;

  return (
    <SimpleConnectorForm
      isEdit={isEdit}
      readOnly={readOnly}
      configFormSchema={[]}
      secretsFormSchema={getSecretsFormSchema(docLinks)}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { SlackActionFields as default };
