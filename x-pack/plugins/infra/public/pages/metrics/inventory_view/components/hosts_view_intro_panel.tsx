/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBetaBadge, EuiLink, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const HostViewIntroPanel = () => (
  <EuiFlexGroup alignItems="center" gutterSize="m">
    <EuiFlexItem grow={false}>
      <EuiBetaBadge
        color={'accent'}
        href="#"
        data-test-subj="inventory-hostsView-button"
        label={i18n.translate('xpack.infra.layout.tryIt', {
          defaultMessage: 'Try it',
        })}
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiIcon type="beaker" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiLink>Introducing a new Hosts analysis experience</EuiLink>
    </EuiFlexItem>
  </EuiFlexGroup>
);
