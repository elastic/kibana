/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewFieldBase } from '@kbn/es-query';
import { useEffect, useState } from 'react';
import { DataPublicPluginStart, IIndexPattern } from 'src/plugins/data/public';
import { prefixIndexPattern } from '../../../../common/ccs_utils';
import {
  INDEX_PATTERN_BEATS,
  INDEX_PATTERN_ELASTICSEARCH,
  INDEX_PATTERN_KIBANA,
  INDEX_PATTERN_LOGSTASH,
} from '../../../../common/constants';
import { MonitoringConfig } from '../../../types';

const INDEX_PATTERNS = `${INDEX_PATTERN_ELASTICSEARCH},${INDEX_PATTERN_KIBANA},${INDEX_PATTERN_LOGSTASH},${INDEX_PATTERN_BEATS}`;

export const useDerivedIndexPattern = (
  data: DataPublicPluginStart,
  config?: MonitoringConfig
): { loading: boolean; derivedIndexPattern: IIndexPattern } => {
  const indexPattern = prefixIndexPattern(config || ({} as MonitoringConfig), INDEX_PATTERNS, '*');
  const [loading, setLoading] = useState<boolean>(true);
  const [fields, setFields] = useState<DataViewFieldBase[]>([]);
  useEffect(() => {
    (async function fetchData() {
      const result = await data.indexPatterns.getFieldsForWildcard({
        pattern: indexPattern,
      });
      setFields(result);
      setLoading(false);
    })();
  }, [indexPattern, data.indexPatterns]);
  return {
    loading,
    derivedIndexPattern: {
      title: indexPattern,
      fields,
    },
  };
};
