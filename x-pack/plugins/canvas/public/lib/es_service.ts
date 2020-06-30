/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPatternAttributes } from 'src/plugins/data/public';

import { API_ROUTE } from '../../common/lib/constants';
import { fetch } from '../../common/lib/fetch';
import { ErrorStrings } from '../../i18n';
import { notifyService } from '../services';
import { platformService } from '../services';

const { esService: strings } = ErrorStrings;

const getApiPath = function () {
  const basePath = platformService.getService().coreStart.http.basePath.get();
  return basePath + API_ROUTE;
};

const getSavedObjectsClient = function () {
  return platformService.getService().coreStart.savedObjects.client;
};

const getAdvancedSettings = function () {
  return platformService.getService().coreStart.uiSettings;
};

export const getFields = (index = '_all') => {
  return fetch
    .get(`${getApiPath()}/es_fields?index=${index}`)
    .then(({ data: mapping }: { data: object }) =>
      Object.keys(mapping)
        .filter((field) => !field.startsWith('_')) // filters out meta fields
        .sort()
    )
    .catch((err: Error) =>
      notifyService.getService().error(err, {
        title: strings.getFieldsFetchErrorMessage(index),
      })
    );
};

export const getIndices = () =>
  getSavedObjectsClient()
    .find<IndexPatternAttributes>({
      type: 'index-pattern',
      fields: ['title'],
      searchFields: ['title'],
      perPage: 1000,
    })
    .then((resp) => {
      return resp.savedObjects.map((savedObject) => {
        return savedObject.attributes.title;
      });
    })
    .catch((err: Error) =>
      notifyService.getService().error(err, { title: strings.getIndicesFetchErrorMessage() })
    );

export const getDefaultIndex = () => {
  const defaultIndexId = getAdvancedSettings().get('defaultIndex');

  return defaultIndexId
    ? getSavedObjectsClient()
        .get<IndexPatternAttributes>('index-pattern', defaultIndexId)
        .then((defaultIndex) => defaultIndex.attributes.title)
        .catch((err) =>
          notifyService
            .getService()
            .error(err, { title: strings.getDefaultIndexFetchErrorMessage() })
        )
    : Promise.resolve('');
};
