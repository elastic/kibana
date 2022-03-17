/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppDataType, ReportViewType, SeriesConfig } from '../types';
import type { DataView } from '../../../../../../../../src/plugins/data_views/common';
import { ReportConfigMap } from '../contexts/exploratory_view_config';

interface Props {
  reportType: ReportViewType;
  dataView: DataView;
  dataType: AppDataType;
  reportConfigMap: ReportConfigMap;
}

export const getDefaultConfigs = ({
  reportType,
  dataType,
  dataView,
  reportConfigMap,
}: Props): SeriesConfig => {
  let configResult: SeriesConfig | undefined;

  reportConfigMap[dataType]?.some((fn) => {
    const config = fn({ dataView });
    if (config.reportType === reportType) {
      configResult = config;
    }
    return config.reportType === reportType;
  });

  if (!configResult) {
    // not a user facing error, more of a dev focused error
    throw new Error(
      `No report config provided for dataType: ${dataType} and reportType: ${reportType}`
    );
  }

  return configResult;
};
