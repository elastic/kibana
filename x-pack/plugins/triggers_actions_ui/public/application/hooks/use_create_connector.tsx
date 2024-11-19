/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { ActionConnector, ActionConnectorWithoutId } from '../../types';
import { createActionConnector } from '../lib/action_connector_api';
import { useKibana } from '../../common/lib/kibana';

type CreateConnectorSchema = Pick<
  ActionConnectorWithoutId,
  'actionTypeId' | 'name' | 'config' | 'secrets'
>;

interface UseCreateConnectorReturnValue {
  isLoading: boolean;
  createConnector: (connector: CreateConnectorSchema) => Promise<ActionConnector | undefined>;
}

export const useCreateConnector = (): UseCreateConnectorReturnValue => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const [isLoading, setIsLoading] = useState(false);
  const abortCtrlRef = useRef(new AbortController());
  const isMounted = useRef(false);

  async function createConnector(connector: CreateConnectorSchema) {
    setIsLoading(true);
    isMounted.current = true;
    abortCtrlRef.current.abort();
    abortCtrlRef.current = new AbortController();

    try {
      const res = await createActionConnector({ http, connector });

      if (isMounted.current) {
        setIsLoading(false);

        toasts.addSuccess(
          i18n.translate(
            'xpack.triggersActionsUI.sections.addConnectorForm.updateSuccessNotificationText',
            {
              defaultMessage: "Created ''{connectorName}''",
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
                'xpack.triggersActionsUI.sections.useCreateConnector.updateErrorNotificationText',
                { defaultMessage: 'Cannot create a connector.' }
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

  return { isLoading, createConnector };
};
