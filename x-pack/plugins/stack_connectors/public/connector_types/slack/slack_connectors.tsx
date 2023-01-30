/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiSpacer, EuiButtonGroup } from '@elastic/eui';
import type { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { useFormContext } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { HiddenField } from '@kbn/triggers-actions-ui-plugin/public';
import * as i18n from './translations';
import { SlackWebApiActionsFields } from './slack_web_api_connectors';
import { SlackWebhookActionFields } from './slack_webhook_connectors';

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
  const [selectedSlackType, setSelectedSlackType] = useState('web_api');

  const onChange = (id: string) => {
    setSelectedSlackType(id);
  };

  const { setFieldValue } = useFormContext();
  useEffect(() => {
    setFieldValue('config.type', selectedSlackType);
  }, [selectedSlackType, setFieldValue]);

  return (
    <>
      <EuiSpacer size="xs" />
      <EuiButtonGroup
        isFullWidth
        buttonSize="m"
        color="primary"
        legend={i18n.BASIC_AUTH_BUTTON_GROUP_LEGEND}
        options={slackTypeButtons}
        idSelected={selectedSlackType}
        onChange={onChange}
      />
      <HiddenField path={'config.type'} config={{ defaultValue: 'web_api' }} />
      <EuiSpacer size="m" />
      {selectedSlackType === 'webhook' ? (
        <SlackWebhookActionFields
          isEdit={isEdit}
          readOnly={readOnly}
          registerPreSubmitValidator={registerPreSubmitValidator}
        />
      ) : null}
      {selectedSlackType === 'web_api' ? (
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
