/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FC, memo } from 'react';
import { EuiPanel, EuiSpacer, CommonProps } from '@elastic/eui';
import { SecurityPageName } from '../../../common/constants';
import { WrapperPage } from '../../common/components/wrapper_page';
import { HeaderPage } from '../../common/components/header_page';
import { SiemNavigation } from '../../common/components/navigation';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { AdministrationSubTab } from '../types';
import { ENDPOINTS_TAB, TRUSTED_APPS_TAB, BETA_BADGE_LABEL } from '../common/translations';
import { getEndpointListPath, getTrustedAppsListPath } from '../common/routing';

interface AdministrationListPageProps {
  beta: boolean;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  actions?: React.ReactNode;
}

export const AdministrationListPage: FC<AdministrationListPageProps & CommonProps> = memo(
  ({ beta, title, subtitle, actions, children, ...otherProps }) => {
    const badgeOptions = !beta ? undefined : { beta: true, text: BETA_BADGE_LABEL };

    return (
      <WrapperPage noTimeline {...otherProps}>
        <HeaderPage title={title} subtitle={subtitle} badgeOptions={badgeOptions}>
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

        <EuiPanel>{children}</EuiPanel>

        <SpyRoute pageName={SecurityPageName.administration} />
      </WrapperPage>
    );
  }
);

AdministrationListPage.displayName = 'AdministrationListPage';
