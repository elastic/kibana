/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import querystring from 'querystring';
import rison from 'rison-node';
import { useLocation } from '../../../../hooks/useLocation';
import { useApmPluginContext } from '../../../../hooks/useApmPluginContext';
import { getTimepickerRisonData } from '../rison_helpers';

export function useTimeSeriesExplorerHref({
  jobId,
  serviceName,
  transactionType,
}: {
  jobId: string;
  serviceName?: string;
  transactionType?: string;
}) {
  const { core } = useApmPluginContext();
  const location = useLocation();

  const search = querystring.stringify(
    {
      _g: rison.encode({
        ml: { jobIds: [jobId] },
        ...getTimepickerRisonData(location.search),
      }),
      ...(serviceName && transactionType
        ? {
            _a: rison.encode({
              mlTimeSeriesExplorer: {
                entities: {
                  'service.name': serviceName,
                  'transaction.type': transactionType,
                },
              },
            }),
          }
        : null),
    },
    undefined,
    undefined,
    {
      encodeURIComponent(str: string) {
        return str;
      },
    }
  );

  return url.format({
    pathname: core.http.basePath.prepend('/app/ml'),
    hash: url.format({ pathname: '/timeseriesexplorer', search }),
  });
}
