/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const logStreamEmbeddableDisplayName = i18n.translate(
  'xpack.infra.logStreamEmbeddable.displayName',
  { defaultMessage: 'Log stream' }
);

export const LogStreamPanelActionMenuItem = () => (
  <EuiFlexGroup justifyContent="spaceBetween">
    {logStreamEmbeddableDisplayName}
    <EuiBadge color="warning">
      {i18n.translate('xpack.infra.logStreamPanelActionMenuItem.deprecatedBadgeLabel', {
        defaultMessage: 'Deprecated',
      })}
    </EuiBadge>
  </EuiFlexGroup>
);
