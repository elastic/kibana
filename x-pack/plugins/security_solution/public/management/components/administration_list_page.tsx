/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FC, memo, useEffect } from 'react';
import { EuiPanel, EuiSpacer, CommonProps } from '@elastic/eui';
import styled from 'styled-components';
import { useHistory, useLocation } from 'react-router-dom';

import { SecurityPageName } from '../../../common/constants';
import { WrapperPage } from '../../common/components/wrapper_page';
import { HeaderPage } from '../../common/components/header_page';
import { SiemNavigation } from '../../common/components/navigation';
import { AdministrationSubTab } from '../types';
import { ENDPOINTS_TAB, TRUSTED_APPS_TAB, BETA_BADGE_LABEL } from '../common/translations';
import { getEndpointListPath, getTrustedAppsListPath } from '../common/routing';

/** Ensure that all flyouts z-index in Administation area show the flyout header */
const EuiPanelStyled = styled(EuiPanel)`
  .euiFlyout {
    z-index: ${({ theme }) => theme.eui.euiZNavigation + 1};
  }
`;

interface AdministrationListPageProps {
  beta: boolean;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  actions?: React.ReactNode;
  headerBackComponent?: React.ReactNode;
}

export const AdministrationListPage: FC<AdministrationListPageProps & CommonProps> = memo(
  ({ beta, title, subtitle, actions, children, headerBackComponent, ...otherProps }) => {
    const { replace: historyReplace } = useHistory();
    const location = useLocation();
    const badgeOptions = !beta ? undefined : { beta: true, text: BETA_BADGE_LABEL };

    useEffect(() => {
      historyReplace({
        ...location,
        state: {
          ...(location.state ?? {}),
          pageName: SecurityPageName.administration,
        },
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [historyReplace, location.pathname, location.state]);

    return (
      <WrapperPage noTimeline {...otherProps}>
        <HeaderPage
          hideSourcerer={true}
          title={title}
          subtitle={subtitle}
          backComponent={headerBackComponent}
          badgeOptions={badgeOptions}
        >
          {actions}
        </HeaderPage>

        <SiemNavigation
          navTabs={{
            [AdministrationSubTab.endpoints]: {
              name: ENDPOINTS_TAB,
              id: AdministrationSubTab.endpoints,
              href: getEndpointListPath({ name: 'endpointList' }),
              urlKey: 'administration',
              pageId: SecurityPageName.administration,
              disabled: false,
            },
            [AdministrationSubTab.trustedApps]: {
              name: TRUSTED_APPS_TAB,
              id: AdministrationSubTab.trustedApps,
              href: getTrustedAppsListPath(),
              urlKey: 'administration',
              pageId: SecurityPageName.administration,
              disabled: false,
            },
          }}
        />

        <EuiSpacer />

        <EuiPanelStyled>{children}</EuiPanelStyled>
      </WrapperPage>
    );
  }
);

AdministrationListPage.displayName = 'AdministrationListPage';
