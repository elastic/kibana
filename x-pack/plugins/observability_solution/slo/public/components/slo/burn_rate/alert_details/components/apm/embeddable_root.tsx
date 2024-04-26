/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { buildQueryFromFilters, Filter } from '@kbn/es-query';
import { ErrorEmbeddable, IEmbeddable } from '@kbn/embeddable-plugin/public';
import React, { useEffect, useRef, useState } from 'react';
import { GetSLOResponse, APMTransactionDurationIndicator } from '@kbn/slo-schema';
import { useKibana } from '../../../../../../utils/kibana_react';
import { BurnRateAlert, BurnRateRule, TimeRange } from '../../types';

type EmbeddableId =
  | 'APM_THROUGHPUT_CHART_EMBEDDABLE'
  | 'APM_LATENCY_CHART_EMBEDDABLE'
  | 'APM_ALERTING_FAILED_TRANSACTIONS_CHART_EMBEDDABLE'
  | 'APM_ALERTING_LATENCY_CHART_EMBEDDABLE'
  | 'APM_ALERTING_THROUGHPUT_CHART_EMBEDDABLE';

interface APMEmbeddableRootProps {
  slo: APMTransactionDurationSLOResponse;
  dataTimeRange: TimeRange;
  embeddableId: EmbeddableId;
  alert: BurnRateAlert;
  rule: BurnRateRule;
}

export type APMTransactionDurationSLOResponse = GetSLOResponse & {
  indicator: APMTransactionDurationIndicator;
};

export function APMEmbeddableRoot({
  slo,
  dataTimeRange,
  embeddableId,
  alert,
  rule,
}: APMEmbeddableRootProps) {
  const {
    services: {
      embeddable: { getEmbeddableFactory },
    },
  } = useKibana();

  const [embeddable, setEmbeddable] = useState<ErrorEmbeddable | IEmbeddable | undefined>();

  const embeddableRoot: React.RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);
  const filter = slo.indicator.params.filter;
  const isKueryFilter = typeof filter === 'string';
  const groupingInput = getInputFromGroupings(slo);

  const kuery = isKueryFilter ? filter : undefined;
  const allFilters =
    !isKueryFilter && filter?.filters
      ? [...filter?.filters, ...groupingInput.filters]
      : groupingInput.filters;
  const filters = buildQueryFromFilters(allFilters, undefined, undefined);
  useEffect(() => {
    async function setupEmbeddable() {
      const factory = getEmbeddableFactory(embeddableId);

      const groupingsInput = getInputFromGroupings(slo);

      if (slo) {
        const { transactionName, transactionType, environment, service } = slo.indicator.params;
        const input = {
          id: uuidv4(),
          serviceName: service,
          transactionName: transactionName !== '*' ? transactionName : undefined,
          transactionType: transactionType !== '*' ? transactionType : undefined,
          environment: environment !== '*' ? environment : undefined,
          rangeFrom: dataTimeRange.from.toISOString(),
          rangeTo: dataTimeRange.to.toISOString(),
          latencyThresholdInMicroseconds: slo.indicator.params.threshold * 1000,
          kuery,
          filters,
          alert,
          rule,
          comparisonEnabled: true,
          offset: '1d',
          ...groupingsInput.input,
        };

        const embeddableObject = await factory?.create(input);

        setEmbeddable(embeddableObject);
      }
    }

    setupEmbeddable();
    // Set up exactly once after the component mounts and slo is defined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slo]);

  // We can only render after embeddable has already initialized
  useEffect(() => {
    if (embeddableRoot.current && embeddable) {
      embeddable.render(embeddableRoot.current);
    }
  }, [embeddable, embeddableRoot]);

  return <div ref={embeddableRoot} />;
}

const getInputFromGroupings = (slo: APMTransactionDurationSLOResponse) => {
  const groupings = Object.entries(slo.groupings) as Array<[string, string]>;
  const input: {
    transactionName?: string;
    transactionType?: string;
    serviceName?: string;
    environment?: string;
  } = {};
  const filters: Filter[] = [];
  groupings.forEach(([key, value]) => {
    switch (key) {
      case 'transaction.name':
        input.transactionName = value;
        break;
      case 'transaction.type':
        input.transactionType = value;
        break;
      case 'service.name':
        input.serviceName = value;
        break;
      case 'service.environment':
        input.environment = value;
        break;
      default:
        filters.push({
          meta: {
            type: 'custom',
            alias: null,
            key,
            params: {
              query: value,
            },
            disabled: false,
          },
          query: {
            match_phrase: {
              [key]: value,
            },
          },
        });
    }
  });

  return {
    input,
    filters,
  };
};
