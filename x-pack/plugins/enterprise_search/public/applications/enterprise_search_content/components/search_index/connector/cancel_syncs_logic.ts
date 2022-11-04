/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { Actions } from '../../../../shared/api_logic/create_api_logic';
import {
  clearFlashMessages,
  flashAPIErrors,
  flashSuccessToast,
} from '../../../../shared/flash_messages';

import {
  CancelSyncsApiArgs,
  CancelSyncsApiLogic,
} from '../../../api/connector/cancel_syncs_api_logic';
import { IndexViewLogic } from '../index_view_logic';

type CancelSyncsApiActions = Actions<CancelSyncsApiArgs, {}>;

interface CancelSyncsLogicValues {
  connectorId?: string;
  isConnectorIndex: boolean;
}

interface CancelSyncsLogicActions {
  cancelSyncs: () => void;
  cancelSyncsApiError: CancelSyncsApiActions['apiError'];
  cancelSyncsApiSuccess: CancelSyncsApiActions['apiSuccess'];
  makeCancelSyncsRequest: CancelSyncsApiActions['makeRequest'];
}

export const CancelSyncsLogic = kea<MakeLogicType<CancelSyncsLogicValues, CancelSyncsLogicActions>>(
  {
    actions: {
      cancelSyncs: true,
    },
    connect: {
      actions: [
        CancelSyncsApiLogic,
        [
          'apiError as cancelSyncsApiError',
          'apiSuccess as cancelSyncsApiSuccess',
          'makeRequest as makeCancelSyncsRequest',
        ],
      ],
      values: [IndexViewLogic, ['connectorId', 'isConnectorIndex']],
    },
    listeners: ({ actions, values }) => ({
      cancelSyncs: () => {
        if (values.isConnectorIndex && values.connectorId) {
          actions.makeCancelSyncsRequest({ connectorId: values.connectorId });
        }
      },
      cancelSyncsApiError: (e) => flashAPIErrors(e),
      cancelSyncsApiSuccess: () => {
        flashSuccessToast(
          i18n.translate('xpack.enterpriseSearch.content.searchIndex.cancelSyncs.successMessage', {
            defaultMessage: 'Successfully canceled syncs',
          })
        );
      },
      makeCancelSyncsRequest: () => {
        clearFlashMessages();
      },
    }),
  }
);
