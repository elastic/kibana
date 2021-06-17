/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppDataType, ReportViewTypes } from '../types';
import { getRumDistributionConfig } from './rum/data_distribution_config';
import { getSyntheticsDistributionConfig } from './synthetics/data_distribution_config';
import { getSyntheticsKPIConfig } from './synthetics/kpi_over_time_config';
import { getKPITrendsLensConfig } from './rum/kpi_over_time_config';
import { IndexPattern } from '../../../../../../../../src/plugins/data/common';
import { getCoreWebVitalsConfig } from './rum/core_web_vitals_config';

interface Props {
  reportType: keyof typeof ReportViewTypes;
  indexPattern: IndexPattern;
  dataType: AppDataType;
}

export const getDefaultConfigs = ({ reportType, dataType, indexPattern }: Props) => {
  switch (dataType) {
    case 'ux':
      if (reportType === 'dist') {
        return getRumDistributionConfig({ indexPattern });
      }
      if (reportType === 'cwv') {
        return getCoreWebVitalsConfig({ indexPattern });
      }
      return getKPITrendsLensConfig({ indexPattern });
    case 'synthetics':
      if (reportType === 'dist') {
        return getSyntheticsDistributionConfig({ indexPattern });
      }
      return getSyntheticsKPIConfig({ indexPattern });

    default:
      return getKPITrendsLensConfig({ indexPattern });
  }
};
