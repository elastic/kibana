/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { Connector } from '../../../../../../../common/types/connectors';
import { Actions } from '../../../../../shared/api_logic/create_api_logic';
import {
  flashAPIErrors,
  flashSuccessToast,
  clearFlashMessages,
} from '../../../../../shared/flash_messages';
import {
  ConnectorNameAndDescriptionApiLogic,
  PutConnectorNameAndDescriptionArgs,
  PutConnectorNameAndDescriptionResponse,
} from '../../../../api/connector/update_connector_name_and_description_api_logic';
import {
  FetchIndexApiLogic,
  FetchIndexApiParams,
  FetchIndexApiResponse,
} from '../../../../api/index/fetch_index_api_logic';
import { isConnectorIndex, isCrawlerIndex } from '../../../../utils/indices';

type NameAndDescription = Partial<Pick<Connector, 'name' | 'description'>>;

type ConnectorNameAndDescriptionActions = Pick<
  Actions<PutConnectorNameAndDescriptionArgs, PutConnectorNameAndDescriptionResponse>,
  'apiError' | 'apiSuccess' | 'makeRequest'
> & {
  fetchIndexApiSuccess: Actions<FetchIndexApiParams, FetchIndexApiResponse>['apiSuccess'];
  saveNameAndDescription: () => void;
  setIsEditing(isEditing: boolean): { isEditing: boolean };
  setLocalNameAndDescription(nameAndDescription: NameAndDescription): NameAndDescription;
  setNameAndDescription(nameAndDescription: NameAndDescription): NameAndDescription;
  updateLocalNameAndDescription(nameAndDescription: NameAndDescription): NameAndDescription;
};

interface ConnectorNameAndDescriptionValues {
  index: FetchIndexApiResponse;
  isEditing: boolean;
  localNameAndDescription: NameAndDescription;
  nameAndDescription: NameAndDescription;
}

export const ConnectorNameAndDescriptionLogic = kea<
  MakeLogicType<ConnectorNameAndDescriptionValues, ConnectorNameAndDescriptionActions>
>({
  actions: {
    saveNameAndDescription: true,
    setIsEditing: (isEditing: boolean) => ({
      isEditing,
    }),
    setLocalNameAndDescription: (nameAndDescription) => nameAndDescription,
    setNameAndDescription: (nameAndDescription) => nameAndDescription,
    updateLocalNameAndDescription: (nameAndDescription) => nameAndDescription,
  },
  connect: {
    actions: [
      ConnectorNameAndDescriptionApiLogic,
      ['apiError', 'apiSuccess', 'makeRequest'],
      FetchIndexApiLogic,
      ['apiSuccess as fetchIndexApiSuccess'],
    ],
    values: [FetchIndexApiLogic, ['data as index']],
  },
  events: ({ actions, values }) => ({
    afterMount: () =>
      actions.setNameAndDescription(
        isConnectorIndex(values.index) || isCrawlerIndex(values.index) ? values.index.connector : {}
      ),
  }),
  listeners: ({ actions, values }) => ({
    apiError: (error) => flashAPIErrors(error),
    apiSuccess: ({ indexName }) => {
      flashSuccessToast(
        i18n.translate(
          'xpack.enterpriseSearch.content.indices.configurationConnector.configuration.successToast.title',
          { defaultMessage: 'Configuration successfully updated' }
        )
      );
      FetchIndexApiLogic.actions.makeRequest({ indexName });
    },
    fetchIndexApiSuccess: (index) => {
      if (!values.isEditing && isConnectorIndex(index)) {
        actions.setNameAndDescription(index.connector);
      }
    },
    makeRequest: () => clearFlashMessages(),
    saveNameAndDescription: () => {
      if (isConnectorIndex(values.index) || isCrawlerIndex(values.index)) {
        actions.makeRequest({
          connectorId: values.index.connector.id,
          indexName: values.index.connector.index_name,
          ...values.localNameAndDescription,
        });
      }
    },
    setIsEditing: (isEditing) => {
      if (isEditing) {
        actions.setLocalNameAndDescription(values.nameAndDescription);
      }
    },
  }),
  path: ['enterprise_search', 'content', 'connector_name_and_description'],
  reducers: () => ({
    isEditing: [
      false,
      {
        apiSuccess: () => false,
        setIsEditing: (_, { isEditing }) => isEditing,
      },
    ],
    localNameAndDescription: [
      {},
      {
        setLocalNameAndDescription: (_, nameAndDescription) => nameAndDescription,
        updateLocalNameAndDescription: (localNameAndDescription, nameAndDescription) => ({
          ...localNameAndDescription,
          ...nameAndDescription,
        }),
      },
    ],
    nameAndDescription: [
      {},
      {
        apiSuccess: (_, { description, name }) => ({ description, name }),
        setNameAndDescription: (_, nameAndDescription) => nameAndDescription,
      },
    ],
  }),
});
