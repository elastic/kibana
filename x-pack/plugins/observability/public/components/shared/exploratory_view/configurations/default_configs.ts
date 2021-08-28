/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppDataType, ReportViewType } from '../types';
import { getRumDistributionConfig } from './rum/data_distribution_config';
import { getSyntheticsDistributionConfig } from './synthetics/data_distribution_config';
import { getSyntheticsKPIConfig } from './synthetics/kpi_over_time_config';
import { getKPITrendsLensConfig } from './rum/kpi_over_time_config';
import { IndexPattern } from '../../../../../../../../src/plugins/data/common';
import { getCoreWebVitalsConfig } from './rum/core_web_vitals_config';
import { getMobileKPIConfig } from './mobile/kpi_over_time_config';
import { getMobileKPIDistributionConfig } from './mobile/distribution_config';
import { getMobileDeviceDistributionConfig } from './mobile/device_distribution_config';

interface Props {
  reportType: ReportViewType;
  indexPattern: IndexPattern;
  dataType: AppDataType;
}

export const getDefaultConfigs = ({ reportType, dataType, indexPattern }: Props) => {
  switch (dataType) {
    case 'ux':
      if (reportType === 'data-distribution') {
        return getRumDistributionConfig({ indexPattern });
      }
      if (reportType === 'core-web-vitals') {
        return getCoreWebVitalsConfig({ indexPattern });
      }
      return getKPITrendsLensConfig({ indexPattern });
    case 'synthetics':
      if (reportType === 'data-distribution') {
        return getSyntheticsDistributionConfig({ indexPattern });
      }
      return getSyntheticsKPIConfig({ indexPattern });
    case 'mobile':
      if (reportType === 'data-distribution') {
        return getMobileKPIDistributionConfig({ indexPattern });
      }
      if (reportType === 'device-data-distribution') {
        return getMobileDeviceDistributionConfig({ indexPattern });
      }
      return getMobileKPIConfig({ indexPattern });
    default:
      return getKPITrendsLensConfig({ indexPattern });
  }
};
