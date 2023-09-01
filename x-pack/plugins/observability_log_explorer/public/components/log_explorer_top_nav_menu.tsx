/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';
import { AppMountParameters } from '@kbn/core-application-browser';
import {
  EuiBetaBadge,
  EuiHeaderLink,
  EuiHeaderLinks,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useKibanaContextForPlugin } from '../utils/use_kibana';
import { betaBadgeDescription, betaBadgeTitle, discoverLinkTitle } from '../../common/translations';

interface LogExplorerTopNavMenuProps {
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  theme$: AppMountParameters['theme$'];
}

export const LogExplorerTopNavMenu = ({
  setHeaderActionMenu,
  theme$,
}: LogExplorerTopNavMenuProps) => {
  const { euiTheme } = useEuiTheme();

  const {
    services: { discover },
  } = useKibanaContextForPlugin();

  return (
    <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
      <EuiHeaderSection
        css={css`
          gap: ${euiTheme.size.m};
        `}
      >
        <EuiHeaderSectionItem>
          <EuiBetaBadge
            label={betaBadgeTitle}
            tooltipContent={betaBadgeDescription}
            alignment="middle"
          />
        </EuiHeaderSectionItem>
        <EuiHeaderLinks gutterSize="xs">
          <EuiHeaderLink
            onClick={() => discover.locator?.navigate({})}
            color="primary"
            iconType="discoverApp"
          >
            {discoverLinkTitle}
          </EuiHeaderLink>
        </EuiHeaderLinks>
      </EuiHeaderSection>
    </HeaderMenuPortal>
  );
};
