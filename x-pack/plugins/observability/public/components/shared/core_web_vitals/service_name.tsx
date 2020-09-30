/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiIcon, EuiText, EuiTitle, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

interface Props {
  name: string;
}

const SERVICE_LABEL = i18n.translate('xpack.observability.ux.coreWebVitals', {
  defaultMessage: 'Service',
});

export function ServiceName({ name }: Props) {
  return (
    <>
      <EuiText>
        {SERVICE_LABEL}
        <EuiToolTip
          content={
            <EuiText>
              <FormattedMessage
                id="xpack.observability.ux.service.help"
                defaultMessage="Most traffic"
              />
            </EuiText>
          }
        >
          <EuiIcon color={'text'} type={'questionInCircle'} />
        </EuiToolTip>
      </EuiText>
      <EuiTitle size="s">
        <h3>{name}</h3>
      </EuiTitle>
    </>
  );
}
