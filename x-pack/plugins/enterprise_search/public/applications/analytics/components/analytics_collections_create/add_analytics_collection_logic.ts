/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { AnalyticsCollection } from '../../../../../common/types/analytics';
import { HttpError, Status } from '../../../../../common/types/api';

import { isAlphaNumericOrUnderscore } from '../../../../../common/utils/is_alphanumeric_underscore';
import { generateEncodedPath } from '../../../shared/encode_path_params';
import { flashAPIErrors } from '../../../shared/flash_messages';
import { KibanaLogic } from '../../../shared/kibana';
import { AddAnalyticsCollectionsAPILogic } from '../../api/add_analytics_collection/add_analytics_collection_api_logic';
import { COLLECTION_VIEW_PATH } from '../../routes';

export interface AddAnalyticsCollectionsActions {
  apiError(error: HttpError): HttpError;
  apiSuccess(collection: AnalyticsCollection): AnalyticsCollection;
  createAnalyticsCollection(): void;
  makeRequest: typeof AddAnalyticsCollectionsAPILogic.actions.makeRequest;
  setInputError(error: string | undefined): { inputError: string };
  setNameValue(name: string): { name: string };
}

interface AddAnalyticsCollectionValues {
  hasInputError: boolean;
  inputError: string;
  isLoading: boolean;
  name: string;
  status: typeof AddAnalyticsCollectionsAPILogic.values.status;
}

export const AddAnalyticsCollectionLogic = kea<
  MakeLogicType<AddAnalyticsCollectionValues, AddAnalyticsCollectionsActions>
>({
  actions: {
    createAnalyticsCollection: () => {},
    setInputError: (inputError: string) => ({ inputError }),
    setNameValue: (name: string) => ({ name }),
  },
  connect: {
    actions: [AddAnalyticsCollectionsAPILogic, ['apiError', 'apiSuccess', 'makeRequest']],
    values: [AddAnalyticsCollectionsAPILogic, ['status']],
  },
  listeners: ({ values, actions }) => ({
    apiError: (error) => flashAPIErrors(error),
    apiSuccess: async ({ name }, breakpoint) => {
      // Wait for propagation of the new collection
      await breakpoint(1000);
      KibanaLogic.values.navigateToUrl(
        generateEncodedPath(COLLECTION_VIEW_PATH, {
          name,
        })
      );
    },
    createAnalyticsCollection: async () => {
      const { name } = values;
      await actions.makeRequest({ name });
    },
    setNameValue: ({ name }) => {
      if (!isAlphaNumericOrUnderscore(name)) {
        const message = i18n.translate(
          'xpack.enterpriseSearch.analytics.collectionsCreate.invalidCollectionName',
          {
            defaultMessage: 'Name must only contain alphanumeric characters and underscores',
          }
        );
        return actions.setInputError(message);
      }
      return actions.setInputError('');
    },
  }),
  path: ['enterprise_search', 'add_analytics_collection'],
  reducers: {
    inputError: [
      '',
      {
        setInputError: (_, { inputError }) => inputError,
      },
    ],
    name: [
      '',
      {
        setNameValue: (_, { name }) => name,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    hasInputError: [() => [selectors.inputError], (inputError) => inputError !== ''],
    isLoading: [
      () => [selectors.status],
      // includes success to include the redirect wait time
      (status: Status) => [Status.LOADING, Status.SUCCESS].includes(status),
    ],
  }),
});
