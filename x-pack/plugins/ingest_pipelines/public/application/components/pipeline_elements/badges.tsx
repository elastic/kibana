/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';

export const DeprecatedPipelineBadge = () => (
  <EuiToolTip
    content={i18n.translate('xpack.ingestPipelines.list.table.deprecatedBadgeTooltip', {
      defaultMessage:
        'This pipeline is no longer supported and might be removed in a future release. Instead, use one of the other pipelines available or create a new one.',
    })}
  >
    <EuiBadge color="warning" data-test-subj="isDeprecatedBadge">
      <FormattedMessage
        id="xpack.ingestPipelines.list.table.deprecatedBadgeLabel"
        defaultMessage="Deprecated"
      />
    </EuiBadge>
  </EuiToolTip>
);

export const ManagedPipelineBadge = () => (
  <EuiBadge color="hollow" data-test-subj="isManagedBadge">
    <FormattedMessage
      id="xpack.ingestPipelines.list.table.managedBadgeLabel"
      defaultMessage="Managed"
    />
  </EuiBadge>
);
