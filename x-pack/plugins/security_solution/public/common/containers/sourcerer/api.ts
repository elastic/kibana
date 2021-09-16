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
    forceSignalsIndex: string;
  };
}

interface SourcererDataView {
  defaultDataView: KibanaDataView;
  kibanaDataViews: KibanaDataView[];
}
/**
 * Creates a single transform given a configuration
 * @param bodies The body for the REST interface that is going to it.
 * @param signal AbortSignal for cancelling request
 * @returns SourcererDataView
 * @throws An error if response is not OK
 */
export const postSourcererDataView = async ({
  body,
  signal,
}: GetSourcererDataView): Promise<SourcererDataView> =>
  KibanaServices.get().http.fetch(SOURCERER_API_URL, {
    method: 'POST',
    body: JSON.stringify(body),
    signal,
  });
