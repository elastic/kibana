/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import { MlGenericUrlState } from '../../../common/types/locator';

export function extractParams<UrlState>(urlState: UrlState) {
  // page should be guaranteed to exist here but <UrlState> is unknown
  // @ts-ignore
  const { page, ...params } = urlState;
  return { page, params };
}

/**
 * Creates generic index based search ML url
 * e.g. `jobs/new_job/datavisualizer?index=3da93760-e0af-11ea-9ad3-3bcfc330e42a`
 */
export function formatGenericMlUrl(
  appBasePath: string,
  page: MlGenericUrlState['page'],
  pageState: MlGenericUrlState['pageState']
): string {
  let url = `${appBasePath}/${page}`;

  if (pageState) {
    const { globalState, appState, index, savedSearchId, ...restParams } = pageState;
    if (index !== undefined && savedSearchId === undefined) {
      url = `${url}?index=${index}`;
    }
    if (index === undefined && savedSearchId !== undefined) {
      url = `${url}?savedSearchId=${savedSearchId}`;
    }

    if (!isEmpty(restParams)) {
      Object.keys(restParams).forEach((key) => {
        url = setStateToKbnUrl(
          key,
          restParams[key],
          { useHash: false, storeInHashQuery: false },
          url
        );
      });
    }

    if (globalState) {
      url = setStateToKbnUrl('_g', globalState, { useHash: false, storeInHashQuery: false }, url);
    }
    if (appState) {
      url = setStateToKbnUrl('_a', appState, { useHash: false, storeInHashQuery: false }, url);
    }
  }

  return url;
}
