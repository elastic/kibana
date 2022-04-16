/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { HttpSetup } from '@kbn/core/public';
import { isEmpty } from 'lodash';
import { AdditionalEmailServices } from '@kbn/actions-plugin/common';
import { EmailConfig } from '../types';
import { getServiceConfig } from './api';

export function useEmailConfig(
  http: HttpSetup,
  currentService: string | undefined,
  editActionConfig: (property: string, value: unknown) => void
) {
  const [emailServiceConfigurable, setEmailServiceConfigurable] = useState<boolean>(false);
  const [emailService, setEmailService] = useState<string | undefined>(undefined);

  const getEmailServiceConfig = useCallback(
    async (service: string) => {
      let serviceConfig: Partial<Pick<EmailConfig, 'host' | 'port' | 'secure'>>;
      try {
        serviceConfig = await getServiceConfig({ http, service });
        setEmailServiceConfigurable(isEmpty(serviceConfig));
      } catch (err) {
        serviceConfig = {};
        setEmailServiceConfigurable(true);
      }

      return serviceConfig;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editActionConfig]
  );

  useEffect(() => {
    (async () => {
      if (emailService) {
        editActionConfig('service', emailService);
        if (emailService === AdditionalEmailServices.EXCHANGE) {
          return;
        }
        const serviceConfig = await getEmailServiceConfig(emailService);

        editActionConfig('host', serviceConfig?.host ? serviceConfig.host : '');
        editActionConfig('port', serviceConfig?.port ? serviceConfig.port : 0);
        editActionConfig('secure', null != serviceConfig?.secure ? serviceConfig.secure : false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailService]);

  useEffect(() => {
    (async () => {
      if (currentService) {
        await getEmailServiceConfig(currentService);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentService]);

  return {
    emailServiceConfigurable,
    setEmailService,
  };
}
