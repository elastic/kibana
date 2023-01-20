/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { useFormContext, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { ButtonGroupField, HiddenField } from '@kbn/triggers-actions-ui-plugin/public';
import * as i18n from './translations';
import { SlackWebApiActionsFields } from './slack_web_api_connectors';
import { SlackWebhookActionFields } from './slack_webhook_connectors';

const getSlackType = (arg: { type: string } | null | undefined) => {
  if (arg == null) {
    return 'web_api';
  }

  return arg.type === 'webhook' ? 'webhook' : 'web_api';
};

const slackTypeButtons = [
  {
    id: 'webhook',
    label: i18n.WEBHOOK,
  },
  {
    id: 'web_api',
    label: i18n.WEB_API,
  },
];

const SlackActionFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  isEdit,
  readOnly,
  registerPreSubmitValidator,
}) => {
  const { setFieldValue } = useFormContext();
  const [{ config, __internal__ }] = useFormData({
    watch: ['config.type', '__internal__.type'],
  });

  const selectedAuthDefaultValue = 'web_api';

  const slackType = config?.type === 'webhook' ? 'webhook' : 'web_api';

  useEffect(() => {
    setFieldValue('config.type', getSlackType(__internal__));
  }, [__internal__, setFieldValue]);

  return (
    <>
      <EuiTitle size="xxs">
        <h4>
          <FormattedMessage
            id="xpack.stackConnectors.components.xmatters.authenticationLabel"
            defaultMessage="Authentication"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <ButtonGroupField
        defaultValue={selectedAuthDefaultValue}
        path={'__internal__.type'}
        label={i18n.BASIC_AUTH_LABEL}
        legend={i18n.BASIC_AUTH_BUTTON_GROUP_LEGEND}
        options={slackTypeButtons}
      />
      <HiddenField path={'config.type'} config={{ defaultValue: 'web_api' }} />
      <EuiSpacer size="m" />
      {slackType === 'webhook' ? (
        <SlackWebhookActionFields
          isEdit={isEdit}
          readOnly={readOnly}
          registerPreSubmitValidator={registerPreSubmitValidator}
        />
      ) : null}
      {slackType === 'web_api' ? (
        <>
          <SlackWebApiActionsFields
            isEdit={isEdit}
            readOnly={readOnly}
            registerPreSubmitValidator={registerPreSubmitValidator}
          />
        </>
      ) : null}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { SlackActionFields as default };
