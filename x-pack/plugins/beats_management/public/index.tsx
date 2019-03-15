/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as euiVars from '@elastic/eui/dist/eui_theme_k6_light.json';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { HashRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { I18nContext } from 'ui/i18n';
import { BASE_PATH } from '../common/constants';
import { Background } from './components/layouts/background';
import { Breadcrumb, BreadcrumbProvider } from './components/navigation/breadcrumb';
import { libs } from './context/libs';
import { AppRouter } from './router';

async function startApp() {
  await libs.framework.createUIAtPath(
    BASE_PATH,
    <ThemeProvider theme={{ eui: euiVars }}>
      <I18nContext>
        <HashRouter basename="/management/beats_management">
          <BreadcrumbProvider useGlobalBreadcrumbs={libs.framework.versionGreaterThen('6.7.0')}>
            <Background>
              <Breadcrumb
                title={i18n.translate('xpack.beatsManagement.management.breadcrumb', {
                  defaultMessage: 'Management',
                })}
              />
              <AppRouter />
            </Background>
          </BreadcrumbProvider>
        </HashRouter>
      </I18nContext>
    </ThemeProvider>,
    libs.framework.versionGreaterThen('6.7.0') ? 'management' : 'self'
  );
  await libs.framework.waitUntilFrameworkReady();

  if (libs.framework.licenseIsAtLeast('standard')) {
    libs.framework.registerManagementSection({
      id: 'beats',
      name: i18n.translate('xpack.beatsManagement.centralManagementSectionLabel', {
        defaultMessage: 'Beats',
      }),
      iconName: 'logoBeats',
    });

    libs.framework.registerManagementUI({
      sectionId: 'beats',
      name: i18n.translate('xpack.beatsManagement.centralManagementLinkLabel', {
        defaultMessage: 'Central Management',
      }),
      basePath: BASE_PATH,
    });
  }
}

startApp();
