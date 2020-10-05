/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiIconTip, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  name: string;
}

const SERVICE_LABEL = i18n.translate('xpack.observability.ux.coreWebVitals.service', {
  defaultMessage: 'Service',
});

const SERVICE_LABEL_HELP = i18n.translate('xpack.observability.ux.service.help', {
  defaultMessage: 'The RUM service with the most traffic is selected',
});

export function ServiceName({ name }: Props) {
  return (
    <>
      <EuiText size="s">
        {SERVICE_LABEL}
        <EuiIconTip
          color="text"
          aria-label={SERVICE_LABEL_HELP}
          type="questionInCircle"
          content={SERVICE_LABEL_HELP}
        />
      </EuiText>
      <EuiTitle size="s">
        <h3>{name}</h3>
      </EuiTitle>
    </>
  );
}
