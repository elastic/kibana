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
    'data-test-subj': 'webhookButton',
  },
  {
    id: 'web_api',
    label: i18n.WEB_API,
    'data-test-subj': 'webApiButton',
  },
];

const SlackActionFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  isEdit,
  readOnly,
  registerPreSubmitValidator,
}) => {
  const { setFieldValue, getFieldDefaultValue } = useFormContext();

  const defaultSlackType = getFieldDefaultValue('config.type');
  const [selectedSlackType, setSelectedSlackType] = useState(
    getFieldDefaultValue<string>('config.type') ?? 'web_api'
  );

  const onChange = (id: string) => {
    setSelectedSlackType(id);
  };

  useEffect(() => {
    setFieldValue('config.type', selectedSlackType);
  }, [selectedSlackType, setFieldValue]);

  return (
    <>
      <EuiSpacer size="xs" />
      {!isEdit && (
        <EuiButtonGroup
          isFullWidth
          buttonSize="m"
          color="primary"
          legend={i18n.SLACK_LEGEND}
          options={slackTypeButtons}
          idSelected={selectedSlackType}
          onChange={onChange}
          data-test-subj="slackTypeChangeButton"
        />
      )}
      <HiddenField path={'config.type'} config={{ defaultValue: defaultSlackType }} />
      <EuiSpacer size="m" />
      {/* The components size depends on slack type option we choose. Just putting a limit to form
          width would change component dehaviour during the sizing. This line make component size to
          max, so it does not change during sizing, but keep the same behaviour the designer put into
          it.
      */}
      <div style={{ width: '100vw', height: 0 }} />
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
