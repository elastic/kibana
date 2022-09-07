/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { ActionConnector, ActionConnectorWithoutId } from '../../types';
import { updateActionConnector } from '../lib/action_connector_api';
import { useKibana } from '../../common/lib/kibana';

type UpdateConnectorSchema = Pick<ActionConnectorWithoutId, 'name' | 'config' | 'secrets'> & {
  id: string;
};

interface UseUpdateConnectorReturnValue {
  isLoading: boolean;
  updateConnector: (connector: UpdateConnectorSchema) => Promise<ActionConnector | undefined>;
}

export const useUpdateConnector = (): UseUpdateConnectorReturnValue => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const [isLoading, setIsLoading] = useState(false);
  const abortCtrlRef = useRef(new AbortController());
  const isMounted = useRef(false);

  async function updateConnector(connector: UpdateConnectorSchema) {
    setIsLoading(true);
    isMounted.current = true;
    abortCtrlRef.current.abort();
    abortCtrlRef.current = new AbortController();

    try {
      const res = await updateActionConnector({ http, connector, id: connector.id });

      if (isMounted.current) {
        setIsLoading(false);

        toasts.addSuccess(
          i18n.translate(
            'xpack.triggersActionsUI.sections.editConnectorForm.updateSuccessNotificationText',
            {
              defaultMessage: "Updated '{connectorName}'",
              values: {
                connectorName: res.name,
              },
            }
          )
        );
      }

      return res;
    } catch (error) {
      if (isMounted.current) {
        setIsLoading(false);

        if (error.name !== 'AbortError') {
          toasts.addDanger(
            error.body?.message ??
              i18n.translate(
                'xpack.triggersActionsUI.sections.editConnectorForm.updateErrorNotificationText',
                { defaultMessage: 'Cannot update a connector.' }
              )
          );
        }
      }
    }
  }

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      abortCtrlRef.current.abort();
    };
  }, []);

  return { isLoading, updateConnector };
};
