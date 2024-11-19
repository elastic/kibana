/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBetaBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function TechnicalPreviewBadge() {
  return (
    <EuiBetaBadge
      label={i18n.translate('xpack.slo.technicalPreviewBadgeTitle', {
        defaultMessage: 'Technical Preview',
      })}
      size="s"
      tooltipPosition="bottom"
      tooltipContent={i18n.translate('xpack.slo.technicalPreviewBadgeDescription', {
        defaultMessage:
          'This functionality is in technical preview and is subject to change or may be removed in future versions. The design and code is less mature than official generally available features and is being provided as-is with no warranties. Technical preview features are not subject to the support service level agreement of official generally available features.',
      })}
    />
  );
}
