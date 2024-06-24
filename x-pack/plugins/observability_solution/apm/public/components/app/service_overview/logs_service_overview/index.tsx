/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

export function LogsServiceOverview() {
  return (
    <div>
      <h1>
        {i18n.translate('xpack.apm.logsServiceOverview.h1.logsServiceOverviewLabel', {
          defaultMessage: 'Logs Service Overview',
        })}
      </h1>
    </div>
  );
}
