/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { ApmDocumentType } from '../../../../common/document_type';
import {
  METRICSET_INTERVAL,
  METRICSET_NAME,
} from '../../../../common/es_fields/apm';
import { RollupInterval } from '../../../../common/rollup';
import { termQuery } from '../../../../common/utils/term_query';
import { getDocumentTypeFilterForServiceDestinationStatistics } from '../spans/get_is_using_service_destination_metrics';
import { getDocumentTypeFilterForTransactions } from '../transactions';

const defaultRollupIntervals = [
  RollupInterval.OneMinute,
  RollupInterval.TenMinutes,
  RollupInterval.SixtyMinutes,
];

function getDefaultFilter(
  metricsetName: string,
  rollupInterval: RollupInterval
) {
  return [
    ...termQuery(METRICSET_NAME, metricsetName),
    ...termQuery(METRICSET_INTERVAL, rollupInterval),
  ];
}

const documentTypeConfigMap: Record<
  ApmDocumentType,
  {
    processorEvent: ProcessorEvent;
    getQuery?: (rollupInterval: RollupInterval) => QueryDslQueryContainer;
    rollupIntervals: RollupInterval[];
  }
> = {
  [ApmDocumentType.ServiceTransactionMetric]: {
    processorEvent: ProcessorEvent.metric,

    getQuery: (rollupInterval) => ({
      bool: {
        filter: getDefaultFilter('service_transaction', rollupInterval),
      },
    }),
    rollupIntervals: defaultRollupIntervals,
  },
  [ApmDocumentType.ServiceSummaryMetric]: {
    processorEvent: ProcessorEvent.metric,
    getQuery: (rollupInterval) => ({
      bool: {
        filter: getDefaultFilter('service_summary', rollupInterval),
      },
    }),
    rollupIntervals: defaultRollupIntervals,
  },
  [ApmDocumentType.TransactionMetric]: {
    processorEvent: ProcessorEvent.metric,
    getQuery: (rollupInterval) => ({
      bool: {
        filter:
          rollupInterval === RollupInterval.OneMinute
            ? getDocumentTypeFilterForTransactions(true)
            : getDefaultFilter('transaction', rollupInterval),
      },
    }),
    rollupIntervals: defaultRollupIntervals,
  },
  [ApmDocumentType.TransactionEvent]: {
    processorEvent: ProcessorEvent.transaction,
    rollupIntervals: [RollupInterval.None],
  },
  [ApmDocumentType.ServiceDestinationMetric]: {
    processorEvent: ProcessorEvent.metric,
    rollupIntervals: defaultRollupIntervals,
    getQuery: (rollupInterval) => ({
      bool: {
        filter:
          rollupInterval === RollupInterval.OneMinute
            ? getDocumentTypeFilterForServiceDestinationStatistics(true)
            : getDefaultFilter('service_destination', rollupInterval),
      },
    }),
  },
};

type DocumentTypeConfigOf<TApmDocumentType extends ApmDocumentType> =
  typeof documentTypeConfigMap[TApmDocumentType];

export function getConfigForDocumentType<
  TApmDocumentType extends ApmDocumentType
>(docType: TApmDocumentType): DocumentTypeConfigOf<TApmDocumentType> {
  return documentTypeConfigMap[docType];
}

export type ProcessorEventOfDocumentType<
  TApmDocumentType extends ApmDocumentType
> = DocumentTypeConfigOf<TApmDocumentType>['processorEvent'];

export function getProcessorEventForDocumentType<
  TApmDocumentType extends ApmDocumentType
>(
  documentType: TApmDocumentType
): ProcessorEventOfDocumentType<TApmDocumentType> {
  return getConfigForDocumentType(documentType).processorEvent;
}
