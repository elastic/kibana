/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EventingCheckbox } from './checkbox';
import { OS, EventingFields } from '../../../../types';
import { ConfigForm } from '../config_form';

export const WindowsEventing = React.memo(() => {
  const checkboxes = [
    {
      name: i18n.translate('xpack.endpoint.policyDetailsConfig.eventingProcess', {
        defaultMessage: 'Process',
      }),
      os: OS.windows,
      protectionField: EventingFields.process,
    },
    {
      name: i18n.translate('xpack.endpoint.policyDetailsConfig.eventingNetwork', {
        defaultMessage: 'Network',
      }),
      os: OS.windows,
      protectionField: EventingFields.network,
    },
  ];

  const renderCheckboxes = () => {
    return checkboxes.map(item => {
      return (
        <EventingCheckbox
          id={`eventing${item.name}`}
          name={item.name}
          os={item.os}
          protectionField={item.protectionField}
        />
      );
    });
  };
  return (
    <ConfigForm type={`Event Collection`} supportedOss={['Windows']}>
      {renderCheckboxes()}
    </ConfigForm>
  );
});
