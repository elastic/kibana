/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServices } from '../../lib/kibana';
import { SOURCERER_API_URL } from '../../../../common/constants';
import { KibanaDataView } from '../../store/sourcerer/model';

export interface GetSourcererDataView {
  signal: AbortSignal;
  body: {
    patternList: string[];
  };
}

export interface SecurityDataView {
  defaultDataView: KibanaDataView;
  kibanaDataViews: KibanaDataView[];
}

export const postSourcererDataView = async ({
  body,
  signal,
}: GetSourcererDataView): Promise<SecurityDataView> =>
  KibanaServices.get().http.fetch(SOURCERER_API_URL, {
    method: 'POST',
    body: JSON.stringify(body),
    signal,
  });

export const getSourcererDataview = async (
  dataViewId: string,
  signal?: AbortSignal
): Promise<KibanaDataView> => {
  return KibanaServices.get().http.fetch<KibanaDataView>(SOURCERER_API_URL, {
    method: 'GET',
    query: { dataViewId },
    asSystemRequest: true,
    signal,
  });
};
