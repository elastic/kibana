/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as euiVars from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { Provider as UnstatedProvider, Subscribe } from 'unstated';
import { Background } from './components/layouts/background';
import { BreadcrumbProvider } from './components/navigation/breadcrumb';
import { Breadcrumb } from './components/navigation/breadcrumb/breadcrumb';
import { BeatsContainer } from './containers/beats';
import { TagsContainer } from './containers/tags';
import { FrontendLibs } from './lib/types';
import { AppRouter } from './router';
import { services } from './kbn_services';
import { ManagementAppMountParams } from '../../../../src/plugins/management/public';

export const renderApp = ({ element, history }: ManagementAppMountParams, libs: FrontendLibs) => {
  ReactDOM.render(
    <ThemeProvider theme={{ eui: euiVars }}>
      <services.I18nContext>
        <Router history={history}>
          <UnstatedProvider inject={[new BeatsContainer(libs), new TagsContainer(libs)]}>
            <BreadcrumbProvider useGlobalBreadcrumbs={libs.framework.versionGreaterThen('6.7.0')}>
              <Subscribe to={[BeatsContainer, TagsContainer]}>
                {(beats: BeatsContainer, tags: TagsContainer) => (
                  <Background>
                    <Breadcrumb
                      title={i18n.translate('xpack.beatsManagement.management.breadcrumb', {
                        defaultMessage: 'Management',
                      })}
                    />
                    <AppRouter libs={libs} beatsContainer={beats} tagsContainer={tags} />
                  </Background>
                )}
              </Subscribe>
            </BreadcrumbProvider>
          </UnstatedProvider>
        </Router>
      </services.I18nContext>
    </ThemeProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
