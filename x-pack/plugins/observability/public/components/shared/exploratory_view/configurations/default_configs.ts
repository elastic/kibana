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
import { DataTypes, ReportTypes } from './constants';

interface Props {
  reportType: ReportViewType;
  indexPattern: IndexPattern;
  dataType: AppDataType;
}

export const getDefaultConfigs = ({ reportType, dataType, indexPattern }: Props) => {
  switch (dataType) {
    case DataTypes.UX:
      if (reportType === ReportTypes.DISTRIBUTION) {
        return getRumDistributionConfig({ indexPattern });
      }
      if (reportType === ReportTypes.CORE_WEB_VITAL) {
        return getCoreWebVitalsConfig({ indexPattern });
      }
      return getKPITrendsLensConfig({ indexPattern });
    case DataTypes.SYNTHETICS:
      if (reportType === ReportTypes.DISTRIBUTION) {
        return getSyntheticsDistributionConfig({ indexPattern });
      }
      return getSyntheticsKPIConfig({ indexPattern });
    case DataTypes.MOBILE:
      if (reportType === ReportTypes.DISTRIBUTION) {
        return getMobileKPIDistributionConfig({ indexPattern });
      }
      if (reportType === ReportTypes.DEVICE_DISTRIBUTION) {
        return getMobileDeviceDistributionConfig({ indexPattern });
      }
      return getMobileKPIConfig({ indexPattern });
    default:
      return getKPITrendsLensConfig({ indexPattern });
  }
};
