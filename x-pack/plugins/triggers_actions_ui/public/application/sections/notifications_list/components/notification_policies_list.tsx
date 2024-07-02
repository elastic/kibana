/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import {
  EuiInMemoryTable,
  EuiButton,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { loadAllActions as loadAllConnectors } from '../../../lib/action_connector_api';
import { ActionConnector } from '../../../../types';
import { useKibana } from '../../../../common/lib/kibana';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';
import { EmptyNotificationsPrompt } from '../../../components/prompts/empty_notifications_prompt';
import {
  CreateNotificationPolicyModal,
  NotificationPolicyWithId,
} from './create_notification_policy_modal';
import { getAllPolicies } from '../../../lib/notification_api/get_all_policies';
import NotificationPolicy from './notification_policy';

interface NotificationPoliciesListOpts {
  setHeaderActions?: (components?: React.ReactNode[]) => void;
}

const NotificationPoliciesList = ({ setHeaderActions }: NotificationPoliciesListOpts) => {
  const {
    http,
    notifications: { toasts },
    actionTypeRegistry,
  } = useKibana().services;

  useEffect(() => {
    setHeaderActions?.([
      <EuiButton
        iconType="plusInCircle"
        key="create-policy"
        data-test-subj="createPolicyButton"
        fill
        onClick={() => setCreatePolicyModalVisibility(true)}
      >
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.notificationPoliciesList.addPolicyButtonLabel"
          defaultMessage="Create policy"
        />
      </EuiButton>,
    ]);
  }, [setHeaderActions]);

  const [createPolicyModalVisible, setCreatePolicyModalVisibility] = useState<boolean>(false);
  const [connectors, setConnectors] = useState<ActionConnector[]>([]);
  const [policies, setPolicies] = useState<NotificationPolicyWithId[]>([]);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState<boolean>(false);
  const [isLoadingConnectors, setIsLoadingConnectors] = useState<boolean>(true);
  useEffect(() => {
    loadConnectors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // const [showWarningText, setShowWarningText] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        setIsLoadingPolicies(true);
        setPolicies(await getAllPolicies({ http }));
      } catch (e) {
        toasts.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.notificationPoliciesList.unableToLoadConnectorTypesMessage',
            { defaultMessage: 'Unable to load notification policies' }
          ),
        });
      } finally {
        setIsLoadingPolicies(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadConnectors() {
    setIsLoadingConnectors(true);
    try {
      const actionsResponse = await loadAllConnectors({ http });
      setConnectors(actionsResponse);
    } catch (e) {
      toasts.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.notificationPoliciesList.unableToLoadConnectorsMessage',
          {
            defaultMessage: 'Unable to load connectors',
          }
        ),
      });
    } finally {
      setIsLoadingConnectors(false);
    }
  }

  const policyTableColumns = [
    {
      field: 'name',
      'data-test-subj': 'policyTableCell-name',
      name: i18n.translate(
        'xpack.triggersActionsUI.sections.notificationPoliciesList.policiesListTable.columns.nameTitle',
        {
          defaultMessage: 'Name',
        }
      ),
      sortable: false,
      truncateText: true,
      render: (value: string, item: NotificationPolicyWithId) => {
        return (
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiLink
                data-test-subj={`edit${item.id}`}
                title={value}
                // onClick={() => editItem(item, EditConnectorTabs.Configuration)}
                key={item.id}
              >
                {value}
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      name: '',
      render: (item: NotificationPolicyWithId) => {
        return (
          <EuiFlexGroup wrap responsive={false} gutterSize="xs" direction="column">
            <NotificationPolicy policy={item} connectors={connectors} />
          </EuiFlexGroup>
        );
      },
    },
  ];

  const table = (
    <EuiInMemoryTable
      loading={isLoadingPolicies}
      items={policies}
      sorting={true}
      itemId="id"
      columns={policyTableColumns}
      data-test-subj="policiesTable"
    />
  );

  return (
    <>
      <EuiPageTemplate.Section
        paddingSize="none"
        data-test-subj="notificationsList"
        alignment={policies.length === 0 ? 'center' : 'top'}
      >
        {/* Render the view based on if there's data or if they can save */}
        {(isLoadingPolicies || isLoadingConnectors) && <CenterJustifiedSpinner />}
        {policies.length !== 0 && table}
        {policies.length === 0 && !isLoadingPolicies && (
          <EmptyNotificationsPrompt onCTAClicked={() => setCreatePolicyModalVisibility(true)} />
        )}
        {createPolicyModalVisible && (
          <CreateNotificationPolicyModal
            connectors={connectors}
            connectorTypeRegistry={actionTypeRegistry}
            onClose={() => setCreatePolicyModalVisibility(false)}
          />
        )}
      </EuiPageTemplate.Section>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { NotificationPoliciesList as default };
