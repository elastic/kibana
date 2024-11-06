/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescriptionList, EuiDescriptionListProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';

type ServiceDetailsReturnType =
  APIReturnType<'GET /internal/apm/services/{serviceName}/metadata/details'>;

interface Props {
  opentelemetry: ServiceDetailsReturnType['opentelemetry'];
}

export function OTelDetails({ opentelemetry }: Props) {
  if (!opentelemetry) {
    return null;
  }

  const listItems: EuiDescriptionListProps['listItems'] = [];
  listItems.push({
    title: i18n.translate('xpack.apm.serviceIcons.otelDetails.opentelemetry.language', {
      defaultMessage: 'Language',
    }),
    description: <>{!!opentelemetry.language ? opentelemetry.language : 'unknown'}</>,
  });

  if (!!opentelemetry.sdkVersion) {
    listItems.push({
      title: i18n.translate('xpack.apm.serviceIcons.otelDetails.opentelemetry.sdkVersion', {
        defaultMessage: 'OTel SDK version',
      }),
      description: <>{opentelemetry.sdkVersion}</>,
    });
  }

  if (!!opentelemetry.autoVersion) {
    listItems.push({
      title: i18n.translate('xpack.apm.serviceIcons.otelDetails.opentelemetry.autoVersion', {
        defaultMessage: 'Auto instrumentation agent version',
      }),
      description: <>{opentelemetry.autoVersion}</>,
    });
  }

  return <EuiDescriptionList textStyle="reverse" listItems={listItems} />;
}
