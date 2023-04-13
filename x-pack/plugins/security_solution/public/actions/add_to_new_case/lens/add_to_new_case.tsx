/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import ReactDOM, { unmountComponentAtNode } from 'react-dom';
import type * as H from 'history';

import type { Embeddable } from '@kbn/lens-plugin/public';
import { CommentType } from '@kbn/cases-plugin/common';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import { isInSecurityApp, isLensEmbeddable } from '../../utils';
import { KibanaServices, KibanaContextProvider } from '../../../common/lib/kibana';
import type { StartServices } from '../../../types';
import type { SecurityAppStore } from '../../../common/store';

import {
  ADD_TO_NEW_CASE_ICON,
  ADD_TO_NEW_CASE,
  ADD_TO_CASE_SUCCESS,
} from '../../copy_to_clipboard/constants';
import {
  APP_ID,
  CASES_FEATURE_ID,
  APP_NAME,
  DEFAULT_DARK_MODE,
} from '../../../../common/constants';

export const ACTION_ID = 'embeddable_addToNewCase';

export const createAddToNewCaseLensAction = ({
  history,
  order,
  services,
  store,
}: {
  store: SecurityAppStore;
  order?: number;
  services: StartServices;
  history: H.History;
}) => {
  const {
    cases,
    application: applicationService,
    notifications: { toasts: toastsService },
  } = KibanaServices.get();
  let currentAppId: string | undefined;
  applicationService?.currentAppId$.subscribe((appId) => {
    currentAppId = appId;
  });

  return createAction<{ embeddable: Embeddable }>({
    id: ACTION_ID,
    type: 'actionButton',
    order,
    getIconType: () => ADD_TO_NEW_CASE_ICON,
    getDisplayName: () => ADD_TO_NEW_CASE,
    isCompatible: async ({ embeddable }) =>
      !isErrorEmbeddable(embeddable) &&
      isLensEmbeddable(embeddable) &&
      isInSecurityApp(currentAppId),
    execute: async ({ embeddable }) => {
      const { attributes, timeRange } = embeddable.getInput();

      const casesCapabilities = cases.helpers.getUICapabilities(
        applicationService.capabilities[CASES_FEATURE_ID]
      );

      if (
        attributes == null ||
        timeRange == null ||
        !casesCapabilities.create ||
        !casesCapabilities.read
      ) {
        return;
      }

      const attachments = [
        {
          comment: `!{lens${JSON.stringify({
            timeRange,
            attributes,
          })}}`,
          type: CommentType.user as const,
        },
      ];

      // const createCaseFlyout = cases.hooks.useCasesAddToNewCaseFlyout({
      //   toastContent: ADD_TO_CASE_SUCCESS,
      // });

      // createCaseFlyout.open({ attachments });

      const node = document.createElement('div');
      document.body.appendChild(node);

      const onClose = () => {
        unmountComponentAtNode(node);
        document.body.removeChild(node);
      };

      const flyout = cases.ui.getCreateCaseFlyout({
        permissions: casesCapabilities,
        onClose,
        onSuccess: () => {
          toastsService.addSuccess({
            title: ADD_TO_CASE_SUCCESS,
            // text: ADD_TO_TIMELINE_FAILED_TEXT,
          });
        },
        attachments,
        owner: [APP_ID],
      });

      const element = (
        <KibanaContextProvider
          services={{
            appName: APP_NAME,
            ...services,
          }}
        >
          <EuiThemeProvider darkMode={services.uiSettings.get(DEFAULT_DARK_MODE)}>
            <Provider store={store}>
              <Router history={history}>{flyout}</Router>
            </Provider>
          </EuiThemeProvider>
        </KibanaContextProvider>
      );

      ReactDOM.render(element, node);
    },
  });
};
