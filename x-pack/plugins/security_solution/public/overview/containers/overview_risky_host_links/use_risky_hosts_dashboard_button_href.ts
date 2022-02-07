/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect } from 'react';
import { SavedObjectAttributes } from '@kbn/securitysolution-io-ts-alerting-types';
import { useKibana } from '../../../common/lib/kibana';

const DASHBOARD_REQUEST_BODY_SEARCH = '"Current Risk Score for Hosts"';
export const DASHBOARD_REQUEST_BODY = {
  type: 'dashboard',
  search: DASHBOARD_REQUEST_BODY_SEARCH,
  fields: ['title'],
};

export const useRiskyHostsDashboardButtonHref = (to: string, from: string) => {
  const dashboardLocator = useKibana().services.dashboard?.locator;
  const savedObjectsClient = useKibana().services.savedObjects.client;

  const [buttonHref, setButtonHref] = useState<string | undefined>();

  useEffect(() => {
    if (dashboardLocator && savedObjectsClient) {
      savedObjectsClient.find<SavedObjectAttributes>(DASHBOARD_REQUEST_BODY).then(
        async (DashboardsSO?: {
          savedObjects?: Array<{
            attributes?: SavedObjectAttributes;
            id?: string;
          }>;
        }) => {
          if (DashboardsSO?.savedObjects?.length) {
            const dashboardUrl = await dashboardLocator.getUrl({
              dashboardId: DashboardsSO.savedObjects[0].id,
              timeRange: {
                to,
                from,
              },
            });
            setButtonHref(dashboardUrl);
          }
        }
      );
    }
  }, [dashboardLocator, from, savedObjectsClient, to]);

  return {
    buttonHref,
  };
};
