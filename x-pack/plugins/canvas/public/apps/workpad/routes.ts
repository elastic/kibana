/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch } from 'redux';
// @ts-expect-error
import * as workpadService from '../../lib/workpad_service';
import { notifyService } from '../../services';
import { getBaseBreadcrumb, getWorkpadBreadcrumb, setBreadcrumb } from '../../lib/breadcrumbs';
// @ts-expect-error
import { getDefaultWorkpad } from '../../state/defaults';
import { setWorkpad } from '../../state/actions/workpad';
// @ts-expect-error
import { setAssets, resetAssets } from '../../state/actions/assets';
// @ts-expect-error
import { setPage } from '../../state/actions/pages';
import { getWorkpad } from '../../state/selectors/workpad';
// @ts-expect-error
import { setZoomScale } from '../../state/actions/transient';
import { ErrorStrings } from '../../../i18n';
import { WorkpadApp } from './workpad_app';
import { State } from '../../../types';

const { workpadRoutes: strings } = ErrorStrings;

export const routes = [
  {
    path: '/workpad',
    children: [
      {
        name: 'createWorkpad',
        path: '/create',
        // @ts-expect-error Fix when Router is typed.
        action: (dispatch: Dispatch) => async ({ router }) => {
          const newWorkpad = getDefaultWorkpad();
          try {
            await workpadService.create(newWorkpad);
            dispatch(setWorkpad(newWorkpad));
            dispatch(resetAssets());
            router.redirectTo('loadWorkpad', { id: newWorkpad.id, page: 1 });
          } catch (err) {
            notifyService
              .getService()
              .error(err, { title: strings.getCreateFailureErrorMessage() });
            router.redirectTo('home');
          }
        },
        meta: {
          component: WorkpadApp,
        },
      },
      {
        name: 'loadWorkpad',
        path: '/:id(/page/:page)',
        action: (dispatch: Dispatch, getState: () => State) => async ({
          params,
          // @ts-expect-error Fix when Router is typed.
          router,
        }: {
          params: { id: string; page?: string };
        }) => {
          // load workpad if given a new id via url param
          const state = getState();
          const currentWorkpad = getWorkpad(state);
          if (params.id !== currentWorkpad.id) {
            try {
              const fetchedWorkpad = await workpadService.get(params.id);

              const { assets, ...workpad } = fetchedWorkpad;
              dispatch(setWorkpad(workpad));
              dispatch(setAssets(assets));

              // reset transient properties when changing workpads
              dispatch(setZoomScale(1));
            } catch (err) {
              notifyService
                .getService()
                .error(err, { title: strings.getLoadFailureErrorMessage() });
              return router.redirectTo('home');
            }
          }

          // fetch the workpad again, to get changes
          const workpad = getWorkpad(getState());
          const pageNumber = params.page ? parseInt(params.page, 10) : null;

          // no page provided, append current page to url
          if (!pageNumber || isNaN(pageNumber)) {
            return router.redirectTo('loadWorkpad', { id: workpad.id, page: workpad.page + 1 });
          }

          // set the active page using the number provided in the url
          const pageIndex = pageNumber - 1;
          if (pageIndex !== workpad.page) {
            dispatch(setPage(pageIndex));
          }

          // update the application's breadcrumb
          setBreadcrumb([getBaseBreadcrumb(), getWorkpadBreadcrumb(workpad)]);
        },
        meta: {
          component: WorkpadApp,
        },
      },
    ],
  },
];
