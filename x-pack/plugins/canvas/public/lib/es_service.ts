/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO - clint: convert to service abstraction
import { IndexPatternAttributes } from '@kbn/data-plugin/public';

import { API_ROUTE } from '../../common/lib/constants';
import { fetch } from '../../common/lib/fetch';
import { ErrorStrings } from '../../i18n';
import { pluginServices } from '../services';

const { esService: strings } = ErrorStrings;

const getApiPath = function () {
  const platformService = pluginServices.getServices().platform;
  const basePath = platformService.getBasePath();
  return basePath + API_ROUTE;
};

const getSavedObjectsClient = function () {
  const platformService = pluginServices.getServices().platform;
  return platformService.getSavedObjectsClient();
};

const getAdvancedSettings = function () {
  const platformService = pluginServices.getServices().platform;
  return platformService.getUISettings();
};

export const getFields = (index = '_all') => {
  return fetch
    .get(`${getApiPath()}/es_fields?index=${index}`)
    .then(({ data: mapping }: { data: object }) =>
      Object.keys(mapping)
        .filter((field) => !field.startsWith('_')) // filters out meta fields
        .sort()
    )
    .catch((err: Error) => {
      const notifyService = pluginServices.getServices().notify;
      notifyService.error(err, {
        title: strings.getFieldsFetchErrorMessage(index),
      });
    });
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
    .catch((err: Error) => {
      const notifyService = pluginServices.getServices().notify;
      notifyService.error(err, { title: strings.getIndicesFetchErrorMessage() });
    });

export const getDefaultIndex = () => {
  const defaultIndexId = getAdvancedSettings().get('defaultIndex');

  return defaultIndexId
    ? getSavedObjectsClient()
        .get<IndexPatternAttributes>('index-pattern', defaultIndexId)
        .then((defaultIndex) => defaultIndex.attributes.title)
        .catch((err) => {
          const notifyService = pluginServices.getServices().notify;
          notifyService.error(err, { title: strings.getDefaultIndexFetchErrorMessage() });
        })
    : Promise.resolve('');
};
