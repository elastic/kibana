/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../common/types/api';

import { isAlphaNumericOrUnderscore } from '../../../../../common/utils/is_alphanumeric_underscore';
import { Actions } from '../../../shared/api_logic/create_api_logic';
import { generateEncodedPath } from '../../../shared/encode_path_params';
import { flashAPIErrors, flashSuccessToast } from '../../../shared/flash_messages';
import { KibanaLogic } from '../../../shared/kibana';
import {
  AddAnalyticsCollectionsAPILogic,
  AddAnalyticsCollectionApiLogicArgs,
  AddAnalyticsCollectionApiLogicResponse,
} from '../../api/add_analytics_collection/add_analytics_collection_api_logic';
import { COLLECTION_VIEW_PATH } from '../../routes';

export interface AddAnalyticsCollectionsActions {
  apiError: Actions<
    AddAnalyticsCollectionApiLogicArgs,
    AddAnalyticsCollectionApiLogicResponse
  >['apiError'];
  apiSuccess: Actions<
    AddAnalyticsCollectionApiLogicArgs,
    AddAnalyticsCollectionApiLogicResponse
  >['apiSuccess'];
  createAnalyticsCollection(): void;
  makeRequest: Actions<
    AddAnalyticsCollectionApiLogicArgs,
    AddAnalyticsCollectionApiLogicResponse
  >['makeRequest'];
  setInputError(error: string | null): { inputError: string | null };
  setNameValue(name: string): { name: string };
}

interface AddAnalyticsCollectionValues {
  canSubmit: boolean;
  hasInputError: boolean;
  inputError: string | null;
  isLoading: boolean;
  name: string;
  status: Status;
}

export const AddAnalyticsCollectionLogic = kea<
  MakeLogicType<AddAnalyticsCollectionValues, AddAnalyticsCollectionsActions>
>({
  actions: {
    createAnalyticsCollection: () => {},
    setInputError: (inputError: string | boolean) => ({ inputError }),
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
      flashSuccessToast(
        i18n.translate('xpack.enterpriseSearch.analytics.collectionsCreate.action.successMessage', {
          defaultMessage: "Successfully added collection '{name}'",
          values: {
            name,
          },
        })
      );
      await breakpoint(1000);
      KibanaLogic.values.navigateToUrl(
        generateEncodedPath(COLLECTION_VIEW_PATH, {
          name,
          section: 'events',
        })
      );
    },
    createAnalyticsCollection: () => {
      const { name } = values;
      actions.makeRequest({ name });
    },
    setNameValue: ({ name }) => {
      if (!isAlphaNumericOrUnderscore(name)) {
        const message = i18n.translate(
          'xpack.enterpriseSearch.analytics.collectionsCreate.action.invalidCollectionName',
          {
            defaultMessage: 'Name must only contain alphanumeric characters and underscores',
          }
        );
        return actions.setInputError(message);
      }
      return actions.setInputError(null);
    },
  }),
  path: ['enterprise_search', 'analytics', 'add_analytics_collection'],
  reducers: {
    inputError: [
      null,
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
    canSubmit: [
      () => [selectors.hasInputError, selectors.isLoading, selectors.name],
      (hasInputError, isLoading, name) => !hasInputError && !isLoading && name.length > 0,
    ],
    hasInputError: [() => [selectors.inputError], (inputError) => inputError !== null],
    isLoading: [
      () => [selectors.status],
      // includes success to include the redirect wait time
      (status: Status) => [Status.LOADING, Status.SUCCESS].includes(status),
    ],
  }),
});
