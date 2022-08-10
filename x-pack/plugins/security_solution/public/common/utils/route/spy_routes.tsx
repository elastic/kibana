/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as H from 'history';
import { memo, useEffect, useState } from 'react';
import { withRouter } from 'react-router-dom';
import deepEqual from 'fast-deep-equal';

import type { SpyRouteProps } from './types';
import { useRouteSpy } from './use_route_spy';
import type { SecurityPageName } from '../../../../common/constants';

export const SpyRouteComponent = memo<
  SpyRouteProps & { location: H.Location; pageName: SecurityPageName | undefined }
>(
  ({
    location: { pathname, search },
    history,
    match: {
      params: { detailName, tabName, flowTarget },
    },
    pageName,
    state,
  }) => {
    const [isInitializing, setIsInitializing] = useState(true);
    const [route, dispatch] = useRouteSpy();

    useEffect(() => {
      if (isInitializing && search !== '') {
        dispatch({
          type: 'updateSearch',
          search,
        });
        setIsInitializing(false);
      } else if (search !== '' && search !== route.search) {
        dispatch({
          type: 'updateSearch',
          search,
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);
    useEffect(() => {
      if (pageName && !deepEqual(route.pathName, pathname)) {
        if (isInitializing && detailName == null) {
          dispatch({
            type: 'updateRouteWithOutSearch',
            route: {
              detailName,
              flowTarget,
              history,
              pageName,
              pathName: pathname,
              state,
              tabName,
            },
          });
          setIsInitializing(false);
        } else {
          dispatch({
            type: 'updateRoute',
            route: {
              detailName,
              flowTarget,
              history,
              pageName,
              pathName: pathname,
              search,
              state,
              tabName,
            },
          });
        }
      } else {
        if (pageName && !deepEqual(state, route.state)) {
          dispatch({
            type: 'updateRoute',
            route: {
              detailName,
              flowTarget,
              history,
              pageName,
              pathName: pathname,
              search,
              state,
              tabName,
            },
          });
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, search, pageName, detailName, tabName, flowTarget, state]);
    return null;
  }
);

SpyRouteComponent.displayName = 'SpyRouteComponent';

export const SpyRoute = withRouter(SpyRouteComponent);
