/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useAvgDurationByCountry } from '../../../../../hooks/useAvgDurationByCountry';

import { ChoroplethMap } from '../ChoroplethMap';

export const DurationByCountryMap: React.FC = () => {
  const { data } = useAvgDurationByCountry();

  return (
    <>
      {' '}
      <EuiTitle size="xs">
        <span>
          {i18n.translate(
            'xpack.apm.metrics.durationByCountryMap.avgPageLoadByCountryLabel',
            {
              defaultMessage: 'Avg. page load duration distribution by country',
            }
          )}
        </span>
      </EuiTitle>
      <ChoroplethMap items={data} />
    </>
  );
};
