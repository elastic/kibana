/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiDescriptionList } from '@elastic/eui';
import { EuiDescriptionListProps } from '@elastic/eui/src/components/description_list/description_list';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';

type ServiceDetailsReturnType =
  APIReturnType<'GET /internal/apm/services/{serviceName}/metadata/details'>;

interface Props {
  serverless: ServiceDetailsReturnType['serverless'];
}

export function ServerlessDetails({ serverless }: Props) {
  if (!serverless) {
    return null;
  }

  const listItems: EuiDescriptionListProps['listItems'] = [];

  if (!!serverless.functionNames?.length) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.cloud.functionNameLabel',
        {
          defaultMessage:
            '{functionNames, plural, =0 {Function name} one {Function name} other {Function names}} ',
          values: { functionNames: serverless.functionNames.length },
        }
      ),
      description: (
        <ul>
          {serverless.functionNames.map((type, index) => (
            <li key={index}>
              <EuiBadge color="hollow">{type}</EuiBadge>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (!!serverless.faasTriggerTypes?.length) {
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceIcons.serviceDetails.cloud.faasTriggerTypeLabel',
        {
          defaultMessage:
            '{triggerTypes, plural, =0 {Trigger type} one {Trigger type} other {Trigger types}} ',
          values: { triggerTypes: serverless.faasTriggerTypes.length },
        }
      ),
      description: (
        <ul>
          {serverless.faasTriggerTypes.map((type, index) => (
            <li key={index}>
              <EuiBadge color="hollow">{type}</EuiBadge>
            </li>
          ))}
        </ul>
      ),
    });
  }

  return <EuiDescriptionList textStyle="reverse" listItems={listItems} />;
}
