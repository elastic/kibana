/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect } from 'react';
import type { SavedObjectAttributes } from '@kbn/securitysolution-io-ts-alerting-types';
import { useKibana } from '../lib/kibana';

export const dashboardRequestBody = (title: string) => ({
  type: 'dashboard',
  search: `"${title}"`,
  fields: ['title'],
});

export const useDashboardButtonHref = ({
  to,
  from,
  title,
}: {
  to?: string;
  from?: string;
  title: string;
}) => {
  const {
    dashboard,
    savedObjects: { client: savedObjectsClient },
  } = useKibana().services;

  const [buttonHref, setButtonHref] = useState<string | undefined>();

  useEffect(() => {
    if (dashboard?.locator && savedObjectsClient) {
      savedObjectsClient.find<SavedObjectAttributes>(dashboardRequestBody(title)).then(
        async (DashboardsSO?: {
          savedObjects?: Array<{
            attributes?: SavedObjectAttributes;
            id?: string;
          }>;
        }) => {
          if (DashboardsSO?.savedObjects?.length && to && from) {
            const dashboardUrl = await dashboard?.locator?.getUrl({
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
  }, [dashboard, from, savedObjectsClient, to, title]);

  return {
    buttonHref,
  };
};
