/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { copyToClipboard } from '@elastic/eui';
import {
  CONNECTOR_LABEL,
  COPY_CONNECTOR_ID_LABEL,
  DELETE_CONNECTOR_LABEL,
} from '../../../../common/i18n_string';
import { useKibanaServices } from '../../hooks/use_kibana';
import { EditName } from './edit_name';
import { EditServiceType } from './edit_service_type';
import { EditDescription } from './edit_description';
import { DeleteConnectorModal } from './delete_connector_modal';
import { ConnectorConfiguration } from './connector_config/connector_configuration';
import { useConnector } from '../../hooks/api/use_connector';

export const EditConnector: React.FC = () => {
  const [deleteModalIsOpen, setDeleteModalIsOpen] = useState(false);
  const [menuIsOpen, setMenuIsOpen] = useState(false);

  const { id } = useParams<{ id: string }>();

  useEffect(() => setDeleteModalIsOpen(false), [id, setDeleteModalIsOpen]);
  const {
    application: { navigateToUrl },
  } = useKibanaServices();

  const { data, isLoading } = useConnector(id);

  if (isLoading) {
    <EuiPageTemplate offset={0} grow restrictWidth data-test-subj="svlSearchEditConnectorsPage">
      <EuiPageTemplate.EmptyPrompt
        title={
          <h1>
            {i18n.translate('xpack.serverlessSearch.connectors.loading', {
              defaultMessage: 'Loading',
            })}
          </h1>
        }
      />
    </EuiPageTemplate>;
  }
  if (!data?.connector) {
    return (
      <EuiPageTemplate offset={0} grow restrictWidth data-test-subj="svlSearchEditConnectorsPage">
        <EuiPageTemplate.EmptyPrompt
          title={
            <h1>
              {i18n.translate('xpack.serverlessSearch.connectors.notFound', {
                defaultMessage: 'Could not find connector {id}',
                values: { id },
              })}
            </h1>
          }
          actions={
            <EuiButton
              data-test-subj="serverlessSearchEditConnectorGoBackButton"
              color="primary"
              fill
              onClick={() => navigateToUrl(`./`)}
            >
              {i18n.translate('xpack.serverlessSearch.connectors.goBack', {
                defaultMessage: 'Go back',
              })}
            </EuiButton>
          }
        />
      </EuiPageTemplate>
    );
  }

  const { connector } = data;

  return (
    <EuiPageTemplate offset={0} grow restrictWidth data-test-subj="svlSearchEditConnectorsPage">
      <EuiPageTemplate.Section grow={false} color="subdued">
        <EuiText size="s">{CONNECTOR_LABEL}</EuiText>
        <EuiFlexGroup direction="row" justifyContent="spaceBetween">
          <EuiFlexItem>
            <EditName connector={connector} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {deleteModalIsOpen && (
              <DeleteConnectorModal
                closeDeleteModal={() => setDeleteModalIsOpen(false)}
                connectorId={connector.id}
                connectorName={connector.name}
                onSuccess={() => navigateToUrl('./')}
              />
            )}
            <span>
              <EuiPopover
                id={'connectorMenu'}
                button={
                  <EuiButtonIcon
                    data-test-subj="serverlessSearchEditConnectorButton"
                    aria-label={i18n.translate('xpack.serverlessSearch.connectors.openMenuLabel', {
                      defaultMessage: 'Open menu',
                    })}
                    iconType="boxesVertical"
                    onClick={() => setMenuIsOpen(!menuIsOpen)}
                  />
                }
                isOpen={menuIsOpen}
                closePopover={() => setMenuIsOpen(false)}
                panelPaddingSize="none"
              >
                <EuiContextMenu
                  initialPanelId={0}
                  panels={[
                    {
                      id: 0,
                      items: [
                        {
                          name: COPY_CONNECTOR_ID_LABEL,
                          icon: 'copy',
                          onClick: () => {
                            copyToClipboard(connector.id);
                            setMenuIsOpen(false);
                          },
                        },
                        {
                          name: DELETE_CONNECTOR_LABEL,
                          icon: 'trash',
                          onClick: () => {
                            setDeleteModalIsOpen(true);
                          },
                        },
                      ],
                    },
                  ]}
                />
              </EuiPopover>
            </span>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section>
        <EuiFlexGroup direction="row">
          <EuiFlexItem grow={1}>
            <EditServiceType connector={connector} />
            <EuiSpacer />
            <EditDescription connector={connector} />
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <EuiPanel hasBorder hasShadow={false}>
              <ConnectorConfiguration connector={connector} />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
