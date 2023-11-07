/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function HeaderTitle() {
  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="m"
      alignItems="center"
      justifyContent="flexStart"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        {i18n.translate('xpack.observability.slosPageTitle', {
          defaultMessage: 'SLOs',
        })}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBetaBadge
          label="Beta"
          tooltipPosition="bottom"
          tooltipContent={i18n.translate(
            'xpack.observability.slo.slosPage.headerTitle.betaBadgeDescription',
            {
              defaultMessage:
                'This functionality is in beta and is subject to change. The design and code is less mature than official generally available features and is being provided as-is with no warranties. Beta features are not subject to the support service level agreement of official generally available features.',
            }
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
