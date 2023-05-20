/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage, useI18n } from '@kbn/i18n-react';

import { NoDataLayout } from './components/no_data_layout';

export const EnforceSecurityPage = () => {
  const { formatMessage } = useI18n();

  return (
    <NoDataLayout
      title={formatMessage({
        id: 'xpack.fleet.disabledSecurityTitle',
        defaultMessage: 'Security is not enabled',
      })}
      actionSection={[]}
    >
      <p>
        <FormattedMessage
          id="xpack.fleet.disabledSecurityDescription"
          defaultMessage="You must enable security in Kibana and Elasticsearch to use Elastic Fleet."
        />
      </p>
    </NoDataLayout>
  );
};
