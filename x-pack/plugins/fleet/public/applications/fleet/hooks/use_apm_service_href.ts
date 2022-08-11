/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Overwrite } from 'utility-types';
import useAsync from 'react-use/lib/useAsync';

import { useLocator } from '../../../hooks/use_locator';
import type { DataStream } from '../types';
import { LOCATORS_IDS } from '../constants';

type APMDataStream = Overwrite<DataStream, { package: 'apm' }>;

const isAPMIntegration = (datastream: DataStream): datastream is APMDataStream =>
  Boolean(datastream.package === 'apm');

export const useAPMServiceDetailHref = (datastream: DataStream) => {
  const apmLocator = useLocator(LOCATORS_IDS.APM_LOCATOR);

  const { error, loading, value } = useAsync(() => {
    if (!isAPMIntegration(datastream) || !apmLocator) return Promise.resolve();

    if (datastream.serviceDetails) {
      const { serviceName, environment } = datastream.serviceDetails;

      return apmLocator.getUrl({
        serviceName,
        serviceOverviewTab: datastream.type === 'logs' ? 'errors' : datastream.type,
        query: {
          environment,
        },
      });
    }

    return apmLocator.getUrl({ serviceName: undefined });
  });

  return { isSuccessful: !error && !loading, href: value };
};
