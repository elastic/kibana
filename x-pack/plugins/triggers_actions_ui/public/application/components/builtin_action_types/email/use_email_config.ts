/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { HttpSetup } from 'kibana/public';
import { EmailConfig } from '../types';
import { getServiceConfig } from './api';

export function useEmailConfig(
  http: HttpSetup,
  editActionConfig: (property: string, value: unknown) => void
) {
  const [emailService, setEmailService] = useState<string | undefined>(undefined);

  const getEmailServiceConfig = useCallback(
    async (service: string) => {
      let serviceConfig: Partial<Pick<EmailConfig, 'host' | 'port' | 'secure'>>;
      try {
        serviceConfig = await getServiceConfig({ http, service });
      } catch (err) {
        serviceConfig = {};
      }

      editActionConfig('host', serviceConfig?.host ? serviceConfig.host : '');
      editActionConfig('port', serviceConfig?.port ? serviceConfig.port : 0);
      editActionConfig('secure', null != serviceConfig?.secure ? serviceConfig.secure : false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editActionConfig]
  );

  useEffect(() => {
    (async () => {
      if (emailService) {
        editActionConfig('service', emailService);
        await getEmailServiceConfig(emailService);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailService]);

  return {
    setEmailService,
  };
}
