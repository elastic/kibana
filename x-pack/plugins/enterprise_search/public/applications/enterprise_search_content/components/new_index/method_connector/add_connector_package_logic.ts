/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { ErrorCode } from '../../../../../../common/types/error_codes';

import { generateEncodedPath } from '../../../../app_search/utils/encode_path_params';

import { Actions } from '../../../../shared/api_logic/create_api_logic';
import { flashAPIErrors, flashSuccessToast } from '../../../../shared/flash_messages';
import { KibanaLogic } from '../../../../shared/kibana';
import {
  AddConnectorPackageApiLogic,
  AddConnectorPackageApiLogicArgs,
  AddConnectorPackageApiLogicResponse,
} from '../../../api/connector_package/add_connector_package_api_logic';
import { SEARCH_INDEX_TAB_PATH } from '../../../routes';
import { SearchIndexTabId } from '../../search_index/search_index';

type AddConnectorActions = Pick<
  Actions<AddConnectorPackageApiLogicArgs, AddConnectorPackageApiLogicResponse>,
  'apiError' | 'apiSuccess' | 'makeRequest'
> & {
  setIsModalVisible: (isModalVisible: boolean) => { isModalVisible: boolean };
};

export interface AddConnectorValues {
  isModalVisible: boolean;
}

export const AddConnectorPackageLogic = kea<MakeLogicType<AddConnectorValues, AddConnectorActions>>(
  {
    actions: {
      setIsModalVisible: (isModalVisible: boolean) => ({ isModalVisible }),
    },
    connect: {
      actions: [AddConnectorPackageApiLogic, ['apiError', 'apiSuccess']],
    },
    listeners: {
      apiError: (error) => flashAPIErrors(error),
      apiSuccess: async ({ indexName }, breakpoint) => {
        flashSuccessToast(
          i18n.translate(
            'xpack.enterpriseSearch.content.newIndex.steps.buildConnector.successToast.label',
            { defaultMessage: 'Index created successfully' }
          ),
          {
            text: i18n.translate(
              'xpack.enterpriseSearch.content.newIndex.steps.buildConnector.successToast.description',
              {
                defaultMessage:
                  'You can use App Search engines to build a search experience for your new Elasticsearch index.',
              }
            ),
          }
        );
        // Flash the success toast so people can read it
        // But also give Elasticsearch the chance to propagate the index so we don't end up in an error state after navigating
        await breakpoint(1000);
        KibanaLogic.values.navigateToUrl(
          generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
            indexName,
            tabId: SearchIndexTabId.CONFIGURATION,
          })
        );
      },
    },
    path: ['enterprise_search', 'add_connector'],
    reducers: {
      isModalVisible: [
        false,
        {
          apiError: (_, error) =>
            error.body?.attributes?.error_code === ErrorCode.CONNECTOR_DOCUMENT_ALREADY_EXISTS,
          apiSuccess: () => false,
          setIsModalVisible: (_, { isModalVisible }) => isModalVisible,
        },
      ],
    },
  }
);
