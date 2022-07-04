/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useLocation } from 'react-router-dom';

import { AppLeaveHandler, AppMountParameters } from '@kbn/core/public';
import type { Filter, Query } from '@kbn/es-query';
import { useDispatch } from 'react-redux';
import { DragDropContextWrapper } from '../../common/components/drag_and_drop/drag_drop_context_wrapper';
import { SecuritySolutionAppWrapper } from '../../common/components/page';
import { HelpMenu } from '../../common/components/help_menu';
import { UseUrlState } from '../../common/components/url_state';
import { navTabs } from './home_navigations';
import {
  useInitSourcerer,
  getScopeFromPath,
  useSourcererDataView,
} from '../../common/containers/sourcerer';
import { useUpgradeSecurityPackages } from '../../common/hooks/use_upgrade_security_packages';
import { GlobalHeader } from './global_header';
import { SecuritySolutionTemplateWrapper } from './template_wrapper';
import { ConsoleManager } from '../../management/components/console/components/console_manager';
import {
  useInitializeUrlParam,
  useSyncGlobalQueryString,
} from '../../common/utils/global_query_string';
import { CONSTANTS } from '../../common/components/url_state/constants';
import { inputsActions } from '../../common/store/inputs';
import { useKibana } from '../../common/lib/kibana';

interface HomePageProps {
  children: React.ReactNode;
  onAppLeave: (handler: AppLeaveHandler) => void;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
}

const HomePageComponent: React.FC<HomePageProps> = ({
  children,
  onAppLeave,
  setHeaderActionMenu,
}) => {
  const { pathname } = useLocation();
  useSyncGlobalQueryString();
  useInitSourcerer(getScopeFromPath(pathname));
  useInitSearchBarUrlParams();

  const { browserFields, indexPattern } = useSourcererDataView(getScopeFromPath(pathname));
  // side effect: this will attempt to upgrade the endpoint package if it is not up to date
  // this will run when a user navigates to the Security Solution app and when they navigate between
  // tabs in the app. This is useful for keeping the endpoint package as up to date as possible until
  // a background task solution can be built on the server side. Once a background task solution is available we
  // can remove this.
  useUpgradeSecurityPackages();

  return (
    <SecuritySolutionAppWrapper className="kbnAppWrapper">
      <ConsoleManager>
        <GlobalHeader setHeaderActionMenu={setHeaderActionMenu} />
        <DragDropContextWrapper browserFields={browserFields}>
          <UseUrlState indexPattern={indexPattern} navTabs={navTabs} />
          <SecuritySolutionTemplateWrapper onAppLeave={onAppLeave}>
            {children}
          </SecuritySolutionTemplateWrapper>
        </DragDropContextWrapper>
        <HelpMenu />
      </ConsoleManager>
    </SecuritySolutionAppWrapper>
  );
};

HomePageComponent.displayName = 'HomePage';

export const HomePage = React.memo(HomePageComponent);

const useInitSearchBarUrlParams = () => {
  const dispatch = useDispatch();
  const { filterManager, savedQueries } = useKibana().services.data.query;

  const onInitializeAppQueryUrlParam = useCallback(
    (initialState: Query | null) => {
      if (initialState != null) {
        dispatch(
          inputsActions.setFilterQuery({
            id: 'global',
            query: initialState.query,
            language: initialState.language,
          })
        );
      }
    },
    [dispatch]
  );

  const onInitializeFiltersUrlParam = useCallback(
    (initialState: Filter[] | null) => {
      if (initialState != null) {
        dispatch(
          inputsActions.setSearchBarFilter({
            id: 'global',
            filters: initialState,
          })
        );

        filterManager.setFilters(initialState);
      } else {
        // Clear filters to ensure that other App filters don't leak into security solution.
        filterManager.setFilters([]);
      }
    },
    [filterManager, dispatch]
  );

  const onInitializeSavedQueryUrlParam = useCallback(
    (savedQueryId: string | null) => {
      if (savedQueryId != null && savedQueryId !== '') {
        savedQueries.getSavedQuery(savedQueryId).then((savedQueryData) => {
          const filters = savedQueryData.attributes.filters || [];
          const query = savedQueryData.attributes.query;

          filterManager.setFilters(filters);
          dispatch(
            inputsActions.setSearchBarFilter({
              id: 'global',
              filters,
            })
          );

          dispatch(
            inputsActions.setFilterQuery({
              id: 'global',
              ...query,
            })
          );
          dispatch(inputsActions.setSavedQuery({ id: 'global', savedQuery: savedQueryData }));
        });
      }
    },
    [dispatch, filterManager, savedQueries]
  );

  useInitializeUrlParam(CONSTANTS.appQuery, onInitializeAppQueryUrlParam);
  useInitializeUrlParam(CONSTANTS.filters, onInitializeFiltersUrlParam);
  useInitializeUrlParam(CONSTANTS.savedQuery, onInitializeSavedQueryUrlParam);
};
