/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { HttpSetup } from 'kibana/public';
import { EmailConfig } from '../types';
import { getServerConfig } from './api';

export function useEmailConfig(
  http: HttpSetup,
  editActionConfig: (property: string, value: unknown) => void
) {
  const [emailServerType, setEmailServerType] = useState<string | undefined>(undefined);

  const getEmailServerTypeConfig = useCallback(
    async (server: string) => {
      let serverConfig: Partial<Pick<EmailConfig, 'host' | 'port' | 'secure'>>;
      try {
        serverConfig = await getServerConfig({ http, serverType: server });
      } catch (err) {
        serverConfig = {};
      }

      editActionConfig('host', serverConfig?.host ? serverConfig.host : '');
      editActionConfig('port', serverConfig?.port ? serverConfig.port : 0);
      editActionConfig('secure', null != serverConfig?.secure ? serverConfig.secure : false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editActionConfig]
  );

  useEffect(() => {
    (async () => {
      if (emailServerType) {
        editActionConfig('serverType', emailServerType);
        await getEmailServerTypeConfig(emailServerType);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailServerType]);

  return {
    setEmailServerType,
  };
}
