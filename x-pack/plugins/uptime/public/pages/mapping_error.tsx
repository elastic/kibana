/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import React from 'react';

import { i18n } from '@kbn/i18n';

import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { useTrackPageview } from '../../../observability/public';

export const MappingErrorPage = () => {
  useTrackPageview({ app: 'uptime', path: 'mapping-error' });
  useTrackPageview({ app: 'uptime', path: 'mapping-error', delay: 15000 });

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.uptime.mappingErrorRoute.breadcrumb', {
        defaultMessage: 'Mapping error',
      }),
    },
  ]);

  return (
    <EuiEmptyPrompt
      iconColor="danger"
      iconType="cross"
      title={
        <div>
          <FormattedMessage
            id="xpack.uptime.public.pages.mappingError.title"
            defaultMessage="Heartbeat mappings missing"
          />
        </div>
      }
      body={
        <FormattedMessage
          id="xpack.uptime.public.pages.mappingError.bodyMessage"
          defaultMessage="Incorrect mappings detected! Perhaps you forgot to run the heartbeat {setup} command?"
          values={{ setup: <EuiCode>setup</EuiCode> }}
        />
      }
    />
  );
};
