/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiPage,
  EuiPageBody,
  EuiPageSideBar,
  EuiSideNav,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ReactNode } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { HeaderMenuPortal } from '../../../../../observability/public';
import { ActionMenu } from '../../../application/action_menu';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { getAPMHref } from '../../shared/Links/apm/APMLink';
import { HomeLink } from '../../shared/Links/apm/HomeLink';

interface SettingsProps extends RouteComponentProps<{}> {
  children: ReactNode;
}

export function Settings({ children, location }: SettingsProps) {
  const { appMountParameters, core } = useApmPluginContext();
  const { basePath } = core.http;
  const canAccessML = !!core.application.capabilities.ml?.canAccessML;
  const { search, pathname } = location;

  function getSettingsHref(path: string) {
    return getAPMHref({ basePath, path: `/settings${path}`, search });
  }

  return (
    <>
      <HeaderMenuPortal
        setHeaderActionMenu={appMountParameters.setHeaderActionMenu}
      >
        <ActionMenu />
      </HeaderMenuPortal>
      <HomeLink>
        <EuiButtonEmpty size="s" color="primary" iconType="arrowLeft">
          {i18n.translate('xpack.apm.settings.returnLinkLabel', {
            defaultMessage: 'Return to inventory',
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
        <EuiPageBody>{children}</EuiPageBody>
      </EuiPage>
    </>
  );
}
