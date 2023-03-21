/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { FieldConfig, UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { DocLinksStart } from '@kbn/core/public';
import type { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import * as i18n from './translations';

const { urlField } = fieldValidators;

const getWebhookUrlConfig = (docLinks: DocLinksStart): FieldConfig => ({
  label: i18n.WEBHOOK_URL_LABEL,
  helpText: (
    <EuiLink href={docLinks.links.alerting.teamsAction} target="_blank">
      <FormattedMessage
        id="xpack.stackConnectors.components.teams.webhookUrlHelpLabel"
        defaultMessage="Create a Microsoft Teams Webhook URL"
      />
    </EuiLink>
  ),
  validations: [
    {
      validator: urlField(i18n.WEBHOOK_URL_INVALID),
    },
  ],
});

const TeamsActionFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
  isEdit,
}) => {
  const { docLinks } = useKibana().services;

  return (
    <UseField
      path="secrets.webhookUrl"
      config={getWebhookUrlConfig(docLinks)}
      component={Field}
      componentProps={{
        euiFieldProps: {
          readOnly,
          'data-test-subj': 'teamsWebhookUrlInput',
          fullWidth: true,
        },
      }}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { TeamsActionFields as default };
