/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import * as i18n from './translations';

const PageTitleComponent: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup alignItems="center" data-test-subj="pageTitle" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiTitle data-test-subj="attackDiscoveryPageTitle" size="l">
          <h1>{i18n.ATTACK_DISCOVERY_PAGE_TITLE}</h1>
        </EuiTitle>
      </EuiFlexItem>

      <EuiFlexItem
        grow={false}
        css={css`
          vertical-align: middle;
          padding-left: ${euiTheme.size.m};
          * {
            vertical-align: middle;
          }
        `}
      >
        <EuiBetaBadge
          iconType={'beaker'}
          label={i18n.BETA}
          tooltipContent={i18n.BETA_TOOLTIP}
          size="m"
          color="hollow"
          css={css`
            margin-bottom: ${euiTheme.size.s};
          `}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

PageTitleComponent.displayName = 'PageTitle';

export const PageTitle = React.memo(PageTitleComponent);
