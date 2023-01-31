/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CellAction, CellActionExecutionContext } from '@kbn/cell-actions';
import ReactDOM, { unmountComponentAtNode } from 'react-dom';
import React from 'react';

import type * as H from 'history';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';

import { KibanaContextProvider } from '../../../common/lib/kibana';
import { APP_NAME, DEFAULT_DARK_MODE } from '../../../../common/constants';
import type { SecurityAppStore } from '../../../common/store';
import { fieldHasCellActions, isInSecurityApp } from '../../utils';
import { TopNAction } from '../show_top_n_component';
import type { StartServices } from '../../../types';

const SHOW_TOP = (fieldName: string) =>
  i18n.translate('xpack.securitySolution.actions.showTopTooltip', {
    values: { fieldName },
    defaultMessage: `Show top {fieldName}`,
  });

const ID = 'security_showTopN';
const ICON = 'visBarVertical';
const UNSUPPORTED_FIELD_TYPES = ['date', 'text'];

export interface ShowTopNActionContext extends CellActionExecutionContext {
  metadata?: {
    scopeId?: string;
  };
}

export const createShowTopNAction = ({
  store,
  history,
  services,
  order,
}: {
  store: SecurityAppStore;
  history: H.History;
  services: StartServices;
  order?: number;
}): CellAction<ShowTopNActionContext> => {
  let currentAppId: string | undefined;

  services.application.currentAppId$.subscribe((appId) => {
    currentAppId = appId;
  });

  return {
    id: ID,
    type: ID,
    order,
    getIconType: (): string => ICON,
    getDisplayName: ({ field }) => SHOW_TOP(field.name),
    getDisplayNameTooltip: ({ field }) => SHOW_TOP(field.name),
    isCompatible: async ({ field }) =>
      isInSecurityApp(currentAppId) &&
      fieldHasCellActions(field.name) &&
      !UNSUPPORTED_FIELD_TYPES.includes(field.type),
    execute: async (context) => {
      const node = context.extraContentNodeRef?.current;
      if (!node) return;

      const onClose = () => {
        unmountComponentAtNode(node);
      };

      const element = (
        <KibanaContextProvider
          services={{
            appName: APP_NAME,
            ...services,
          }}
        >
          <EuiThemeProvider darkMode={services.uiSettings.get(DEFAULT_DARK_MODE)}>
            <Provider store={store}>
              <Router history={history}>
                <TopNAction onClose={onClose} context={context} casesService={services.cases} />
              </Router>
            </Provider>
          </EuiThemeProvider>
        </KibanaContextProvider>
      );

      ReactDOM.render(element, node);
    },
  };
};
