/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiLink,
  EuiButton,
  EuiConfirmModal,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { CANCEL_BUTTON_LABEL } from '../../../../../shared/constants';

import { docLinks } from '../../../../../shared/doc_links';

import { ConvertConnectorLogic } from './convert_connector_logic';

export const ConvertConnector: React.FC = () => {
  const { convertConnector, hideModal, showModal } = useActions(ConvertConnectorLogic);
  const { isLoading, isModalVisible } = useValues(ConvertConnectorLogic);

  return (
    <>
      {isModalVisible && (
        <EuiConfirmModal
          onCancel={() => hideModal()}
          onConfirm={() => convertConnector()}
          title={i18n.translate(
            'xpack.enterpriseSearch.content.engine.indices.convertInfexConfirm.title',
            { defaultMessage: 'Sure you want to convert your connector?' }
          )}
          buttonColor="danger"
          cancelButtonText={CANCEL_BUTTON_LABEL}
          confirmButtonText={i18n.translate(
            'xpack.enterpriseSearch.content.engine.indices.convertIndexConfirm.text',
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
                'xpack.enterpriseSearch.content.engine.indices.convertIndexConfirm.description',
                {
                  defaultMessage:
                    "Once you convert a native connector to a self-managed connector client this can't be undone.",
                }
              )}
            </p>
          </EuiText>
        </EuiConfirmModal>
      )}
      <EuiFlexGroup direction="row" alignItems="center" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiIcon type="wrench" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.convertConnector.title',
                {
                  defaultMessage: 'Customize your connector',
                }
              )}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <FormattedMessage
          id="xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.convertConnector.description"
          defaultMessage="Want to customize this native connector? Convert it to a {link}, to be self-managed on your own infrastructure."
          values={{
            link: (
              <EuiLink href={docLinks.buildConnector} target="_blank">
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.convertConnector.linkTitle',
                  { defaultMessage: 'connector client' }
                )}
              </EuiLink>
            ),
          }}
        />
        <EuiSpacer size="s" />
        <EuiButton onClick={() => showModal()}>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.convertConnector.buttonTitle',
            { defaultMessage: 'Convert connector' }
          )}
        </EuiButton>
      </EuiText>
    </>
  );
};
