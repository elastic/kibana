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
// import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { DocLinksStart } from '@kbn/core/public';
import type { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import * as i18n from './translations';

// const { urlField } = fieldValidators;

const getTokenConfig = (docLinks: DocLinksStart): FieldConfig => ({
  label: i18n.TOKEN_LABEL,
  helpText: (
    <EuiLink href={docLinks.links.alerting.slackAction} target="_blank">
      <FormattedMessage
        id="xpack.stackConnectors.components.slack.tokenHelpLabel"
        defaultMessage="Add your Slack App token"
      />
    </EuiLink>
  ),
  validations: [
    {
      validator: () => {},
    },
  ],
});

const SlackConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
}) => {
  const { docLinks } = useKibana().services;

  return (
    <UseField
      path="secrets.token"
      config={getTokenConfig(docLinks)}
      component={Field}
      componentProps={{
        euiFieldProps: {
          readOnly,
          'data-test-subj': 'slackTokenInput',
          fullWidth: true,
        },
      }}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { SlackConnectorFields as default };
