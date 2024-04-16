/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { useKibana } from './use_kibana';

export const useManagementLink = () => {
  const {
    services: { share },
  } = useKibana();
  const managementLocator = useMemo(
    () => share.url.locators.get('MANAGEMENT_APP_LOCATOR'),
    [share]
  );
  const [managementLink, setManagementLink] = useState('');
  useEffect(() => {
    const getLink = async () => {
      const link = await managementLocator?.getUrl({
        sectionId: 'insightsAndAlerting',
        appId: 'triggersActionsConnectors',
      });
      setManagementLink(link || '');
    };
    getLink();
  }, [managementLocator]);

  return managementLink;
};
