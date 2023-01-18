/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiTabbedContent, EuiSpacer } from '@elastic/eui';
import { SlackWebApiConnectorFields } from './slack_web_api_connectors';
import { SlackWebhookActionFields } from './slack_webhook_connectors';

const SlackActionFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  isEdit,
  readOnly,
  registerPreSubmitValidator,
}) => {
  const tabs = [
    {
      id: 'webhook',
      name: 'Webhook',
      content: (
        <>
          <EuiSpacer size="m" />
          <SlackWebhookActionFields
            isEdit={isEdit}
            readOnly={readOnly}
            registerPreSubmitValidator={registerPreSubmitValidator}
          />
        </>
      ),
    },
    {
      id: 'web_api',
      name: 'Web API',
      content: (
        <>
          <EuiSpacer size="m" />
          <SlackWebApiConnectorFields
            isEdit={isEdit}
            readOnly={readOnly}
            registerPreSubmitValidator={registerPreSubmitValidator}
          />
        </>
      ),
    },
  ];

  return <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[1]} autoFocus="selected" />;
};

// eslint-disable-next-line import/no-default-export
export { SlackActionFields as default };
