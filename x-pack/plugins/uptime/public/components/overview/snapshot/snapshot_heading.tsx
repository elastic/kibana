/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const SnapshotHeading = ({ total }: { total: number }) => {
  const monitorsText =
    total === 1
      ? i18n.translate('xpack.uptime.snapshot.monitor', { defaultMessage: 'Monitor' })
      : i18n.translate('xpack.uptime.snapshot.monitors', { defaultMessage: 'Monitors' });

  return (
    <EuiTitle size="s">
      <h2>
        {total} {monitorsText}
      </h2>
    </EuiTitle>
  );
};
