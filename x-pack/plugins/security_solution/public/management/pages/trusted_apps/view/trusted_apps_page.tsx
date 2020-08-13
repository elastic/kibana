/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiPanel, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { SecurityPageName } from '../../../../../common/constants';
import { WrapperPage } from '../../../../common/components/wrapper_page';
import { HeaderPage } from '../../../../common/components/header_page';
import { SiemNavigation } from '../../../../common/components/navigation';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { managementTabs } from '../../../components/management_tabs';

export function TrustedAppsPage() {
  return (
    <WrapperPage noTimeline data-test-subj="policyListPage">
      <HeaderPage
        title={
          <FormattedMessage
            id="xpack.securitySolution.trustedapps.list.pageTitle"
            defaultMessage="Trusted applications"
          />
        }
        subtitle={
          <FormattedMessage
            id="xpack.securitySolution.trustedapps.list.pageSubTitle"
            defaultMessage="View and configure trusted applications"
          />
        }
        badgeOptions={{
          beta: true,
          text: i18n.translate('xpack.securitySolution.trustedapps.list.beta', {
            defaultMessage: 'Beta',
          }),
        }}
      />

      <SiemNavigation navTabs={managementTabs} />

      <EuiSpacer />

      <EuiPanel />

      <SpyRoute pageName={SecurityPageName.administration} />
    </WrapperPage>
  );
}
