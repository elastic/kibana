/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch } from 'redux';
// @ts-expect-error Untyped local
import * as workpadService from '../../lib/workpad_service';
import { setWorkpad } from '../../state/actions/workpad';
// @ts-expect-error Untyped local
import { fetchAllRenderables } from '../../state/actions/elements';
// @ts-expect-error Untyped local
import { setPage } from '../../state/actions/pages';
// @ts-expect-error Untyped local
import { setAssets } from '../../state/actions/assets';
import { ExportApp } from './export';

export const routes = [
  {
    path: '/export/workpad',
    children: [
      {
        name: 'exportWorkpad',
        path: '/pdf/:id/page/:page',
        action: (dispatch: Dispatch) => async ({
          params,
          // @ts-expect-error Fix when Router is typed.
          router,
        }: {
          params: { id: string; page: string };
        }) => {
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
