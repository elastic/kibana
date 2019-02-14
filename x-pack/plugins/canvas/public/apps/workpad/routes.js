/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as workpadService from '../../lib/workpad_service';
import { notify } from '../../lib/notify';
import { getBaseBreadcrumb, getWorkpadBreadcrumb, setBreadcrumb } from '../../lib/breadcrumbs';
import { getDefaultWorkpad } from '../../state/defaults';
import { setWorkpad } from '../../state/actions/workpad';
import { setAssets, resetAssets } from '../../state/actions/assets';
import { gotoPage } from '../../state/actions/pages';
import { getWorkpad } from '../../state/selectors/workpad';
import { isFirstLoad } from '../../state/selectors/app';
import { setCanUserWrite, setFirstLoad } from '../../state/actions/transient';
import { WorkpadApp } from './workpad_app';

export const routes = [
  {
    path: '/workpad',
    children: [
      {
        name: 'createWorkpad',
        path: '/create',
        action: dispatch => async ({ router }) => {
          const newWorkpad = getDefaultWorkpad();
          try {
            await workpadService.create(newWorkpad);
            dispatch(setWorkpad(newWorkpad));
            dispatch(resetAssets());
            router.redirectTo('loadWorkpad', { id: newWorkpad.id, page: 1 });
          } catch (err) {
            notify.error(err, { title: `Couldn't create workpad` });
            // TODO: remove this and switch to checking user privileges when canvas loads when granular app privileges are introduced
            // https://github.com/elastic/kibana/issues/20277
            if (err.response && err.response.status === 403) {
              dispatch(setCanUserWrite(false));
            }
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
        action: (dispatch, getState) => async ({ params, router }) => {
          // load workpad if given a new id via url param
          const state = getState();
          const currentWorkpad = getWorkpad(state);
          const firstLoad = isFirstLoad(state);
          if (params.id !== currentWorkpad.id) {
            try {
              const fetchedWorkpad = await workpadService.get(params.id);

              const { assets, ...workpad } = fetchedWorkpad;
              dispatch(setWorkpad(workpad));
              dispatch(setAssets(assets));

              // tests if user has permissions to write to workpads
              // TODO: remove this and switch to checking user privileges when canvas loads when granular app privileges are introduced
              // https://github.com/elastic/kibana/issues/20277
              if (firstLoad) {
                workpadService.update(params.id, fetchedWorkpad).catch(err => {
                  if (err.response && err.response.status === 403) {
                    dispatch(setCanUserWrite(false));
                  }
                });
                dispatch(setFirstLoad(false));
              }
            } catch (err) {
              notify.error(err, { title: `Couldn't load workpad with ID` });
              return router.redirectTo('home');
            }
          }

          // fetch the workpad again, to get changes
          const workpad = getWorkpad(getState());
          const pageNumber = parseInt(params.page, 10);

          // no page provided, append current page to url
          if (isNaN(pageNumber)) {
            return router.redirectTo('loadWorkpad', { id: workpad.id, page: workpad.page + 1 });
          }

          // set the active page using the number provided in the url
          const pageIndex = pageNumber - 1;
          if (pageIndex !== workpad.page) {
            dispatch(gotoPage(pageIndex));
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
