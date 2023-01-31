/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBetaBadge, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useLinkProps } from '@kbn/observability-plugin/public';
import { css } from '@emotion/react';
import { ExperimentalBadge } from '../../hosts/components/experimental_badge';

export const HostViewIntroPanel = () => {
  const link = useLinkProps({
    app: 'metrics',
    pathname: '/hosts',
  });

  return (
    <EuiFlexGroup
      responsive={false}
      alignItems="center"
      gutterSize="m"
      css={css`
        position: relative;
        z-index: 100;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiBetaBadge
          color={'accent'}
          href={link.href ?? ''}
          data-test-subj="inventory-hostsView-badge"
          label={i18n.translate('xpack.infra.layout.tryIt', {
            defaultMessage: 'Try it',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ExperimentalBadge iconType="beaker" tooltipPosition="top" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink data-test-subj="inventory-hostsView-link" {...link}>
          {i18n.translate('xpack.infra.layout.hostsLandingPageLink', {
            defaultMessage: 'Introducing a new Hosts analysis experience',
          })}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
