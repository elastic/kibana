/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { fetch } from '@kbn/interpreter/common/lib/fetch';
import { API_ROUTE } from '../../common/lib/constants';
import { notify } from './notify';

const basePath = chrome.getBasePath();
const apiPath = basePath + API_ROUTE;

export const getFields = (index = '_all') => {
  return fetch
    .get(`${apiPath}/es_fields?index=${index}`)
    .then(({ data: mapping }) =>
      Object.keys(mapping)
        .filter(field => !field.startsWith('_')) // filters out meta fields
        .sort()
    )
    .catch(err =>
      notify.error(err, { title: `Couldn't fetch Elasticsearch fields for '${index}'` })
    );
};

export const getIndices = () => {
  return fetch
    .get(`${apiPath}/es_indices`)
    .then(({ data: indices }) => indices)
    .catch(err => notify.error(err, { title: `Couldn't fetch Elasticsearch indices` }));
};
