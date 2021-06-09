/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPage, EuiPageBody, EuiPageSideBar, EuiSideNav } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ReactNode, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { getAPMHref } from '../../shared/Links/apm/APMLink';

export function SettingsTemplate({ children }: { children: ReactNode }) {
  const { core } = useApmPluginContext();
  const history = useHistory();
  const { basePath } = core.http;
  const canAccessML = !!core.application.capabilities.ml?.canAccessML;
  const { search, pathname } = history.location;

  const [isSideNavOpenOnMobile, setisSideNavOpenOnMobile] = useState(false);

  const toggleOpenOnMobile = () => {
    setisSideNavOpenOnMobile((prevState) => !prevState);
  };

  function getSettingsHref(path: string) {
    return getAPMHref({ basePath, path: `/settings${path}`, search });
  }

  return (
    <EuiPage style={{ backgroundColor: 'white' }}>
      <EuiPageSideBar>
        <EuiSideNav
          toggleOpenOnMobile={() => toggleOpenOnMobile()}
          isOpenOnMobile={isSideNavOpenOnMobile}
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
                        isSelected: pathname === '/settings/anomaly-detection',
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
  );
}
