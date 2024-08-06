/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { InspectorContextProvider } from '@kbn/observability-shared-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { Router } from '@kbn/shared-ux-router';

import { SyntheticsSharedContext } from './contexts/synthetics_shared_context';
import { kibanaService } from '../../utils/kibana_service';
import { ActionMenu } from './components/common/header/action_menu';
import { TestNowModeFlyoutContainer } from './components/test_now_mode/test_now_mode_flyout_container';
import { SyntheticsAppProps, SyntheticsSettingsContextProvider } from './contexts';
import { PageRouter } from './routes';
import { setBasePath, store } from './state';

const Application = (props: SyntheticsAppProps) => {
  const {
    basePath,
    canSave,
    coreStart,
    startPlugins,
    renderGlobalHelpControls,
    setBadge,
    appMountParameters,
  } = props;

  useEffect(() => {
    renderGlobalHelpControls();
    setBadge(
      !canSave
        ? {
            text: i18n.translate('xpack.synthetics.badge.readOnly.text', {
              defaultMessage: 'Read only',
            }),
            tooltip: i18n.translate('xpack.synthetics.badge.readOnly.tooltip', {
              defaultMessage: 'Unable to save',
            }),
            iconType: 'glasses',
          }
        : undefined
    );
  }, [canSave, renderGlobalHelpControls, setBadge]);

  kibanaService.theme = props.appMountParameters.theme$;

  store.dispatch(setBasePath(basePath));

  const PresentationContextProvider =
    startPlugins.presentationUtil?.ContextProvider ?? React.Fragment;

  return (
    <KibanaRenderContextProvider {...coreStart}>
      <KibanaThemeProvider
        theme={coreStart.theme}
        modify={{
          breakpoint: {
            xxl: 1600,
            xxxl: 2000,
          },
        }}
      >
        <SyntheticsSharedContext {...props}>
          <PresentationContextProvider>
            <Router history={appMountParameters.history}>
              <SyntheticsSettingsContextProvider {...props}>
                <div className={APP_WRAPPER_CLASS} data-test-subj="syntheticsApp">
                  <InspectorContextProvider>
                    <PageRouter />
                    <ActionMenu appMountParameters={appMountParameters} />
                    <TestNowModeFlyoutContainer />
                  </InspectorContextProvider>
                </div>
              </SyntheticsSettingsContextProvider>
            </Router>
          </PresentationContextProvider>
        </SyntheticsSharedContext>
      </KibanaThemeProvider>
    </KibanaRenderContextProvider>
  );
};

export const SyntheticsApp = (props: SyntheticsAppProps) => <Application {...props} />;
