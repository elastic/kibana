/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  loadActionTypes,
  loadAllActions as loadConnectors,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { ActionTypeIndex } from '@kbn/triggers-actions-ui-plugin/public/types';

interface Props {
  focusInput: () => void;
  isDisabled: boolean;
  onSelectorChange: (id: string) => void;
  packageName: string;
}

interface KibanaDeps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export const AddConnectorFlyout = ({
  focusInput,
  isDisabled,
  onSelectorChange,
  packageName,
}: Props) => {
  const [addFlyoutVisible, setAddFlyoutVisibility] = useState<boolean>(false);
  const {
    services: {
      application,
      triggersActionsUi,
      http,
      notifications: { toasts },
    },
  } = useKibana<KibanaDeps>();
  const [newConnector, setNewConnector] = useState<unknown | null>({ actionTypeId: packageName });
  const test = useKibana();
  const [connectors, setConnectors] = useState<ActionConnector[]>([]);

  const { getAddConnectorFlyout, getConnectorSelection } = triggersActionsUi;
  const canEdit: boolean = !!application?.capabilities.actions.save;
  const [actionTypesIndex, setActionTypesIndex] = useState<ActionTypeIndex | undefined>(undefined);
  const [actionTypeRegistered, setActionTypeRegistered] = useState<ActionTypeIndex | undefined>({});
  // load action types
  useEffect(() => {
    (async () => {
      try {
        const registeredActionTypes = (
          await loadActionTypes({
            http,
            // featureId: 'siem',
          })
        ).sort((a, b) => a.name.localeCompare(b.name));
        setActionTypeRegistered(registeredActionTypes);

        const index: ActionTypeIndex = {};
        for (const actionTypeItem of registeredActionTypes) {
          index[actionTypeItem.id] = actionTypeItem;
        }
        setActionTypesIndex(index);
      } catch (e) {
        toasts.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.actionForm.unableToLoadConnectorTypesMessage',
            { defaultMessage: 'Unable to load connector types' }
          ),
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // load connectors
  useEffect(() => {
    (async () => {
      try {
        const loadedConnectors = await loadConnectors({ http });
        setConnectors(loadedConnectors);
      } catch (e) {
        toasts.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.actionForm.unableToLoadActionsMessage',
            {
              defaultMessage: 'Unable to load connectors',
            }
          ),
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ConnectorAddFlyout = useMemo(
    () =>
      getAddConnectorFlyout({
        onClose: () => {
          setAddFlyoutVisibility(false);
        },
        onConnectorCreated: (connector) => setNewConnector(connector),
        actionTypeRegistry: triggersActionsUi.actionTypeRegistry,
        featureId: 'siem',
        defaultConnector: triggersActionsUi.actionTypeRegistry.get(packageName),
      }),
    [getAddConnectorFlyout, triggersActionsUi.actionTypeRegistry]
  );

  const ConnectorsList = getConnectorSelection({
    actionTypeRegistry: triggersActionsUi.actionTypeRegistry,
    connectors,
    actionTypesIndex,
    allowGroupConnector: [packageName],
    actionTypeRegistered,
    accordionIndex: 0,
    actionItem: newConnector,
    onConnectorSelected: (id: string) => {
      const newConnector = connectors.find((connector) => connector.id === id);
      if (newConnector) {
        onSelectorChange(newConnector);
        setNewConnector(newConnector);
      }
    },
  });
  return (
    <>
      {addFlyoutVisible ? ConnectorAddFlyout : null}
      <EuiButtonEmpty
        data-test-subj="createConnectorButton"
        onClick={() => setAddFlyoutVisibility(true)}
        size="s"
        isDisabled={isDisabled || !canEdit}
      >
        <FormattedMessage
          id="xpack.synthetics.alerts.settings.addConnector"
          defaultMessage="Add connector"
        />
      </EuiButtonEmpty>
      {connectors.length && actionTypesIndex && ConnectorsList}
    </>
  );
};
