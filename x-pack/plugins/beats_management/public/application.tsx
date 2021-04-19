/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as euiVars from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { Provider as UnstatedProvider, Subscribe } from 'unstated';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
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
                    <EuiCallOut
                      title={i18n.translate('xpack.beatsManagement.management.deprecationTitle', {
                        defaultMessage: 'Beats central management has been deprecated',
                      })}
                      color="warning"
                      iconType="help"
                    >
                      <p>
                        <FormattedMessage
                          id="xpack.beatsManagement.management.deprecationMessage"
                          defaultMessage="We have ceased development on Beats central management and are working on a
                          comprehensive solution to replace it. Thank you for participating in the
                          beta and providing feedback. If you have any questions or concerns, please
                          reach out to us on the {forumLink}."
                          values={{
                            forumLink: (
                              <EuiLink
                                href="https://discuss.elastic.co/c/beats"
                                external
                                target="_blank"
                              >
                                <FormattedMessage
                                  id="xpack.beatsManagement.management.forumLink"
                                  defaultMessage="Discuss forum"
                                />
                              </EuiLink>
                            ),
                          }}
                        />
                      </p>
                    </EuiCallOut>
                    <EuiSpacer />
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
