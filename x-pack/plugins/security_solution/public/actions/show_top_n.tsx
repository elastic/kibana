/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from '@kbn/ui-actions-plugin/public';
import { i18n } from '@kbn/i18n';
import ReactDOM, { unmountComponentAtNode } from 'react-dom';
import React from 'react';
import { EuiWrappingPopover } from '@elastic/eui';

import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { Provider } from 'react-redux';
import { Router, useLocation } from 'react-router-dom';
import type { ScopedHistory } from '@kbn/core/public';
import { StatefulTopN } from '../common/components/top_n';
import type { SecurityAppStore } from '../plugin';
import { KibanaContextProvider, useGetUserCasesPermissions } from '../common/lib/kibana';
import { APP_ID, APP_NAME, DEFAULT_DARK_MODE } from '../../common/constants';
import type { StartServices } from '../types';
import { getScopeFromPath, useSourcererDataView } from '../common/containers/sourcerer';
import type { ActionContext } from './types';

const SHOW_TOP = (fieldName: string) =>
  i18n.translate('xpack.securitySolution.actions.showTopTooltip', {
    values: { fieldName },
    defaultMessage: `Show top {fieldName}`,
  });

const ID = 'show-top-n';
const ICON = 'visBarVertical';

export const createShowTopNAction = ({
  store,
  services,
  history,
  order,
}: {
  store: SecurityAppStore;
  services: StartServices;
  history: ScopedHistory<unknown>;
  order?: number;
}) =>
  createAction<ActionContext>({
    id: ID,
    type: ID,
    order,
    getIconType: (): string => ICON,
    getDisplayName: ({ field }) => SHOW_TOP(field),
    isCompatible: async ({ field, value }: ActionContext) => field != null && value != null,
    execute: async (context: ActionContext) => {
      const onClose = () => {
        if (context.extraContentNodeRef.current !== null) {
          unmountComponentAtNode(context.extraContentNodeRef.current);
        }
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
                <TopNAction onClose={onClose} context={context} services={services} />
              </Router>
            </Provider>
          </EuiThemeProvider>
        </KibanaContextProvider>
      );

      ReactDOM.render(element, context.extraContentNodeRef.current);
    },
  });

const TopNAction = ({
  onClose,
  context,
  services,
}: {
  onClose: () => void;
  context: ActionContext;
  services: StartServices;
}) => {
  const { pathname } = useLocation();
  const { browserFields, indexPattern } = useSourcererDataView(getScopeFromPath(pathname));
  const userCasesPermissions = useGetUserCasesPermissions();
  const CasesContext = services.cases.ui.getCasesContext();

  if (!context.nodeRef.current) return null;

  return (
    <CasesContext owner={[APP_ID]} permissions={userCasesPermissions}>
      <EuiWrappingPopover
        button={context.nodeRef.current}
        isOpen={true}
        closePopover={onClose}
        anchorPosition={'downCenter'}
        hasArrow={false}
        repositionOnScroll
        ownFocus
        attachToAnchor={false}
      >
        <StatefulTopN
          field={context.field}
          showLegend
          scopeId={context.metadata?.scopeId}
          toggleTopN={onClose}
          value={context.value}
          indexPattern={indexPattern}
          browserFields={browserFields}
        />
      </EuiWrappingPopover>
    </CasesContext>
  );
};
