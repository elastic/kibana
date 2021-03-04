/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function ExperimentalBadge() {
  return (
    <EuiBetaBadge
      label={i18n.translate('xpack.observability.experimentalBadgeLabel', {
        defaultMessage: 'Experimental',
      })}
      tooltipContent={i18n.translate('xpack.observability.experimentalBadgeDescription', {
        defaultMessage:
          'This functionality is experimental and may be changed or removed completely in a future release. Elastic will take a best effort approach to fix any issues, but experimental features are not subject to the support SLA of official GA features.',
      })}
    />
  );
}
