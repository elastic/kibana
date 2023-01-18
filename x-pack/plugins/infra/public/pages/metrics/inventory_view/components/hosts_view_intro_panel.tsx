/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBetaBadge, EuiLink, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useLinkProps } from '@kbn/observability-plugin/public';
import { css } from '@emotion/react';

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
        <EuiLink data-test-subj="inventory-hostsView-button" {...link}>
          Introducing a new Hosts analysis experience
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
