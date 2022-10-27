/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { FieldFilter as Filter } from '@kbn/es-query';
import { type QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { isNil, isEmpty } from 'lodash';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { environmentQuery } from '../../../../../../common/utils/environment_query';
import { useApmParams } from '../../../../../hooks/use_apm_params';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
  PROCESSOR_EVENT,
} from '../../../../../../common/elasticsearch_fieldnames';

function termQuery(
  field: string,
  value: string | boolean | number | undefined | null
) {
  return isNil(value) ? [] : [{ term: { [field]: value } }];
}

function getFilter([query]: QueryDslQueryContainer[]): Filter[] {
  return isEmpty(query)
    ? []
    : [
        {
          meta: {},
          query,
        },
      ];
}

export function useMapFilters() {
  const {
    path: { serviceName },
    query: { environment, transactionType },
  } = useApmParams('/services/{serviceName}/overview');

  return useMemo(() => {
    return [
      ...getFilter(termQuery(PROCESSOR_EVENT, ProcessorEvent.transaction)),
      ...getFilter(termQuery(SERVICE_NAME, serviceName)),
      ...getFilter(termQuery(TRANSACTION_TYPE, transactionType)),
      ...getFilter(environmentQuery(environment)),
    ];
  }, [environment, transactionType, serviceName]);
}
