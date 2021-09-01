/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';

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
      // TODO: placeholder copy
      title={<div>Heartbeat mappings are not installed</div>}
      body={<div>You need to stop Heartbeat, delete your indices, and restart Heartbeat.</div>}
    />
  );
};
