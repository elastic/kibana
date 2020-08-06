/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
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
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';

export function Settings(props: { children: ReactNode }) {
  const { core } = useApmPluginContext();
  const { basePath } = core.http;
  const canAccessML = !!core.application.capabilities.ml?.canAccessML;
  const { search, pathname } = useLocation();

  function getSettingsHref(path: string) {
    return getAPMHref({ basePath, path: `/settings${path}`, search });
  }

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
                    href: getSettingsHref('/agent-configuration'),
                    isSelected: pathname.startsWith(
                      '/settings/agent-configuration'
                    ),
                  },
                  ...(canAccessML
                    ? [
                        {
                          name: i18n.translate(
                            'xpack.apm.settings.anomalyDetection',
                            {
                              defaultMessage: 'Anomaly detection',
                            }
                          ),
                          id: '4',
                          href: getSettingsHref('/anomaly-detection'),
                          isSelected:
                            pathname === '/settings/anomaly-detection',
                        },
                      ]
                    : []),
                  {
                    name: i18n.translate('xpack.apm.settings.customizeApp', {
                      defaultMessage: 'Customize app',
                    }),
                    id: '3',
                    href: getSettingsHref('/customize-ui'),
                    isSelected: pathname === '/settings/customize-ui',
                  },
                  {
                    name: i18n.translate('xpack.apm.settings.indices', {
                      defaultMessage: 'Indices',
                    }),
                    id: '2',
                    href: getSettingsHref('/apm-indices'),
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
}
