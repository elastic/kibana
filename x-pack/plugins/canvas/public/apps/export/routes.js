/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as workpadService from '../../lib/workpad_service';
import { setWorkpad } from '../../state/actions/workpad';
import { fetchAllRenderables } from '../../state/actions/elements';
import { setPage } from '../../state/actions/pages';
import { setAssets } from '../../state/actions/assets';
import { ExportApp } from './export';

export const routes = [
  {
    path: '/export/workpad',
    children: [
      {
        name: 'exportWorkpad',
        path: '/pdf/:id/page/:page',
        action: dispatch => async ({ params, router }) => {
          // load workpad if given a new id via url param
          const fetchedWorkpad = await workpadService.get(params.id);
          const pageNumber = parseInt(params.page, 10);

          // redirect to home app on invalid workpad id or page number
          if (fetchedWorkpad == null && isNaN(pageNumber)) {
            return router.redirectTo('home');
          }

          const { assets, ...workpad } = fetchedWorkpad;
          dispatch(setAssets(assets));
          dispatch(setWorkpad(workpad, { loadPages: false }));
          dispatch(setPage(pageNumber - 1));
          dispatch(fetchAllRenderables({ onlyActivePage: true }));
        },
        meta: {
          component: ExportApp,
        },
      },
    ],
  },
];
