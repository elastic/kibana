/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiPage,
  EuiSideNav,
  EuiPageSideBar,
  EuiPageBody,
} from '@elastic/eui';
import { HomeLink } from '../../shared/Links/apm/HomeLink';
import { useLocation } from '../../../hooks/useLocation';
import { getAPMHref } from '../../shared/Links/apm/APMLink';

export const Settings: React.FC = (props) => {
  const { search, pathname } = useLocation();
  return (
    <>
      <HomeLink>
        <EuiButtonEmpty size="s" color="primary" iconType="arrowLeft">
          {i18n.translate('xpack.apm.settings.returnToOverviewLinkLabel', {
            defaultMessage: 'Return to overview',
          })}
        </EuiButtonEmpty>
      </HomeLink>
      <EuiPage>
        <EuiPageSideBar>
          <EuiSideNav
            items={[
              {
                name: i18n.translate('xpack.apm.settings.pageTitle', {
                  defaultMessage: 'Settings',
                }),
                id: 0,
                items: [
                  {
                    name: i18n.translate('xpack.apm.settings.agentConfig', {
                      defaultMessage: 'Agent Configuration',
                    }),
                    id: '1',
                    href: getAPMHref('/settings/agent-configuration', search),
                    isSelected: pathname.startsWith(
                      '/settings/agent-configuration'
                    ),
                  },
                  {
                    name: i18n.translate(
                      'xpack.apm.settings.anomalyDetection',
                      {
                        defaultMessage: 'Anomaly detection',
                      }
                    ),
                    id: '4',
                    href: getAPMHref('/settings/anomaly-detection', search),
                    isSelected: pathname === '/settings/anomaly-detection',
                  },
                  {
                    name: i18n.translate('xpack.apm.settings.customizeApp', {
                      defaultMessage: 'Customize app',
                    }),
                    id: '3',
                    href: getAPMHref('/settings/customize-ui', search),
                    isSelected: pathname === '/settings/customize-ui',
                  },
                  {
                    name: i18n.translate('xpack.apm.settings.indices', {
                      defaultMessage: 'Indices',
                    }),
                    id: '2',
                    href: getAPMHref('/settings/apm-indices', search),
                    isSelected: pathname === '/settings/apm-indices',
                  },
                ],
              },
            ]}
          />
        </EuiPageSideBar>
        <EuiPageBody>{props.children}</EuiPageBody>
      </EuiPage>
    </>
  );
};
