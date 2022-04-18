/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { DataViewsPublicPluginStart, DataView } from '@kbn/data-views-plugin/public';
import { prefixIndexPattern } from '../../../../common/ccs_utils';
import {
  CCS_REMOTE_PATTERN,
  INDEX_PATTERN_BEATS,
  INDEX_PATTERN_ELASTICSEARCH,
  INDEX_PATTERN_KIBANA,
  INDEX_PATTERN_LOGSTASH,
} from '../../../../common/constants';
import { MonitoringConfig } from '../../../types';

const INDEX_PATTERNS = `${INDEX_PATTERN_ELASTICSEARCH},${INDEX_PATTERN_KIBANA},${INDEX_PATTERN_LOGSTASH},${INDEX_PATTERN_BEATS}`;

export const useDerivedIndexPattern = (
  dataViews: DataViewsPublicPluginStart,
  config?: MonitoringConfig
): { loading: boolean; derivedIndexPattern?: DataView } => {
  const indexPattern = prefixIndexPattern(
    config || ({} as MonitoringConfig),
    INDEX_PATTERNS,
    CCS_REMOTE_PATTERN
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [dataView, setDataView] = useState<DataView>();
  useEffect(() => {
    (async function fetchData() {
      const result = await dataViews.create({ title: indexPattern });
      setDataView(result);
      setLoading(false);
    })();
  }, [indexPattern, dataViews]);
  return {
    loading,
    derivedIndexPattern: dataView,
  };
};
