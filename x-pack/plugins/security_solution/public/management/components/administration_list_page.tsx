/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, memo } from 'react';
import { CommonProps } from '@elastic/eui';
import { SecurityPageName } from '../../../common/constants';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { BETA_BADGE_LABEL } from '../common/translations';

interface AdministrationListPageProps {
  beta: boolean;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  actions?: React.ReactNode;
  headerBackComponent?: React.ReactNode;
}

export const AdministrationListPage: FC<AdministrationListPageProps & CommonProps> = memo(
  ({ beta, title, subtitle, actions, children, headerBackComponent, ...otherProps }) => {
    const badgeOptions = !beta ? undefined : { beta: true, text: BETA_BADGE_LABEL };

    return (
      <SecuritySolutionPageWrapper noTimeline {...otherProps}>
        <HeaderPage
          hideSourcerer={true}
          title={title}
          subtitle={subtitle}
          backComponent={headerBackComponent}
          badgeOptions={badgeOptions}
        >
          {actions}
        </HeaderPage>
        {children}

        <SpyRoute pageName={SecurityPageName.administration} />
      </SecuritySolutionPageWrapper>
    );
  }
);

AdministrationListPage.displayName = 'AdministrationListPage';
