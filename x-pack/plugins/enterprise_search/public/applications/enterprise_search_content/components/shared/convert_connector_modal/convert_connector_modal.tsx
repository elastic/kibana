/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiConfirmModal, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CANCEL_BUTTON_LABEL } from '../../../../shared/constants';

import { ConvertConnectorLogic } from '../../search_index/connector/native_connector_configuration/convert_connector_logic';

export const ConvertConnectorModal: React.FC = () => {
  const { convertConnector, hideModal } = useActions(ConvertConnectorLogic);
  const { isLoading } = useValues(ConvertConnectorLogic);
  return (
    <EuiConfirmModal
      onCancel={() => hideModal()}
      onConfirm={() => convertConnector()}
      title={i18n.translate(
        'xpack.enterpriseSearch.searchApplications.searchApplication.indices.convertInfexConfirm.title',
        { defaultMessage: 'Sure you want to convert your connector?' }
      )}
      buttonColor="danger"
      cancelButtonText={CANCEL_BUTTON_LABEL}
      confirmButtonText={i18n.translate(
        'xpack.enterpriseSearch.searchApplications.searchApplication.indices.convertIndexConfirm.text',
        {
          defaultMessage: 'Yes',
        }
      )}
      isLoading={isLoading}
      defaultFocusedButton="confirm"
      maxWidth
    >
      <EuiText>
        <p>
          {i18n.translate(
            'xpack.enterpriseSearch.searchApplications.searchApplication.indices.convertIndexConfirm.description',
            {
              defaultMessage:
                "Once you convert a native connector to a self-managed connector client this can't be undone.",
            }
          )}
        </p>
      </EuiText>
    </EuiConfirmModal>
  );
};
