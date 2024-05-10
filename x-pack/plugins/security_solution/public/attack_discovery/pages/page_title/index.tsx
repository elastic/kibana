/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import * as i18n from './translations';

const BETA_BADGE_SIZE = 24; // px

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
        css={css`
          border: 1px solid ${euiTheme.colors.lightShade};
          border-radius: 50%;
          height: ${BETA_BADGE_SIZE}px;
          margin-left: ${euiTheme.size.m};
          overflow: hidden;
          transform: translate(0, 9px);
          width: ${BETA_BADGE_SIZE}px;
        `}
        grow={false}
      >
        <EuiToolTip content={i18n.BETA}>
          <EuiIcon
            css={css`
              transform: translate(3px, 2px);
            `}
            color="hollow"
            data-test-subj="betaIcon"
            size="m"
            type="beta"
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

PageTitleComponent.displayName = 'PageTitle';

export const PageTitle = React.memo(PageTitleComponent);
