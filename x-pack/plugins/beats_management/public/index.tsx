/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as euiVars from '@elastic/eui/dist/eui_theme_k6_light.json';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import React from 'react';
import { HashRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { Provider as UnstatedProvider, Subscribe } from 'unstated';
import { BASE_PATH } from '../common/constants';
import { Background } from './components/layouts/background';
import { BreadcrumbProvider } from './components/navigation/breadcrumb';
import { BeatsContainer } from './containers/beats';
import { TagsContainer } from './containers/tags';
import { compose } from './lib/compose/kibana';
import { FrontendLibs } from './lib/types';
import { AppRouter } from './router';

async function startApp(libs: FrontendLibs) {
  libs.framework.renderUIAtPath(
    BASE_PATH,
    <ThemeProvider theme={{ eui: euiVars }}>
      <I18nProvider>
        <HashRouter basename="/management/beats_management">
          <UnstatedProvider inject={[new BeatsContainer(libs), new TagsContainer(libs)]}>
            <BreadcrumbProvider>
              <Subscribe to={[BeatsContainer, TagsContainer]}>
                {(beats: BeatsContainer, tags: TagsContainer) => (
                  <Background>
                    <AppRouter libs={libs} beatsContainer={beats} tagsContainer={tags} />
                  </Background>
                )}
              </Subscribe>
            </BreadcrumbProvider>
          </UnstatedProvider>
        </HashRouter>
      </I18nProvider>
    </ThemeProvider>,
    libs.framework.getUISetting('k7design') ? 'management' : 'self'
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
        defaultMessage: 'Central Management (Beta)',
      }),
      basePath: BASE_PATH,
    });
  }
}

startApp(compose());
