/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { AlertExecutorOptions, AlertServices } from '../../../../../alerting/server';
import {
  AlertStates,
  Comparator,
  LogDocumentCountAlertParams,
  Criterion,
} from '../../../../common/alerting/logs/types';
import { InfraBackendLibs } from '../../infra_types';
import { getIntervalInSeconds } from '../../../utils/get_interval_in_seconds';
import { InfraSource } from '../../../../common/http_api/source_api';

const checkValueAgainstComparatorMap: {
  [key: string]: (a: number, b: number) => boolean;
} = {
  [Comparator.GT]: (a: number, b: number) => a > b,
  [Comparator.GT_OR_EQ]: (a: number, b: number) => a >= b,
  [Comparator.LT]: (a: number, b: number) => a < b,
  [Comparator.LT_OR_EQ]: (a: number, b: number) => a <= b,
};

export const createLogThresholdExecutor = (alertUUID: string, libs: InfraBackendLibs) =>
  async function({ services, params }: AlertExecutorOptions) {
    const { count, criteria } = params as LogDocumentCountAlertParams;
    const { alertInstanceFactory, savedObjectsClient, callCluster } = services;
    const { sources } = libs;

    const sourceConfiguration = await sources.getSourceConfiguration(savedObjectsClient, 'default');
    const indexPattern = sourceConfiguration.configuration.logAlias;

    const alertInstance = alertInstanceFactory(alertUUID);

    try {
      const query = getESQuery(
        params as LogDocumentCountAlertParams,
        sourceConfiguration.configuration
      );
      const result = await getResults(query, indexPattern, callCluster);

      if (checkValueAgainstComparatorMap[count.comparator](result.count, count.value)) {
        alertInstance.scheduleActions(FIRED_ACTIONS.id, {
          matchingDocuments: result.count,
          conditions: createConditionsMessage(criteria),
        });

        alertInstance.replaceState({
          alertState: AlertStates.ALERT,
        });
      } else {
        alertInstance.replaceState({
          alertState: AlertStates.OK,
        });
      }
    } catch (e) {
      alertInstance.replaceState({
        alertState: AlertStates.ERROR,
      });

      throw new Error(e);
    }
  };

const getESQuery = (
  params: LogDocumentCountAlertParams,
  sourceConfiguration: InfraSource['configuration']
): object => {
  const { timeSize, timeUnit, criteria } = params;
  const interval = `${timeSize}${timeUnit}`;
  const intervalAsSeconds = getIntervalInSeconds(interval);
  const to = Date.now();
  const from = to - intervalAsSeconds * 1000;

  const rangeFilters = [
    {
      range: {
        [sourceConfiguration.fields.timestamp]: {
          gte: from,
          lte: to,
          format: 'epoch_millis',
        },
      },
    },
  ];

  const positiveComparators = getPositiveComparators();
  const negativeComparators = getNegativeComparators();
  const positiveCriteria = criteria.filter(criterion =>
    positiveComparators.includes(criterion.comparator)
  );
  const negativeCriteria = criteria.filter(criterion =>
    negativeComparators.includes(criterion.comparator)
  );
  // Positive assertions (things that "must" match)
  const mustFilters = buildFiltersForCriteria(positiveCriteria);
  // Negative assertions (things that "must not" match)
  const mustNotFilters = buildFiltersForCriteria(negativeCriteria);

  const query = {
    query: {
      bool: {
        filter: [...rangeFilters],
        ...(mustFilters.length > 0 && { must: mustFilters }),
        ...(mustNotFilters.length > 0 && { must_not: mustNotFilters }),
      },
    },
  };

  return query;
};

type SupportedESQueryTypes = 'term' | 'match' | 'match_phrase' | 'range';
type Filter = {
  [key in SupportedESQueryTypes]?: object;
};

const buildFiltersForCriteria = (criteria: LogDocumentCountAlertParams['criteria']) => {
  let filters: Filter[] = [];

  criteria.forEach(criterion => {
    const criterionQuery = buildCriterionQuery(criterion);
    if (criterionQuery) {
      filters = [...filters, criterionQuery];
    }
  });
  return filters;
};

const buildCriterionQuery = (criterion: Criterion): Filter | undefined => {
  const { field, value, comparator } = criterion;

  const queryType = getQueryMappingForComparator(comparator);

  switch (queryType) {
    case 'term':
      return {
        term: {
          [field]: {
            value,
          },
        },
      };
      break;
    case 'match': {
      return {
        match: {
          [field]: value,
        },
      };
    }
    case 'match_phrase': {
      return {
        match_phrase: {
          [field]: value,
        },
      };
    }
    case 'range': {
      const comparatorToRangePropertyMapping: {
        [key: string]: string;
      } = {
        [Comparator.LT]: 'lt',
        [Comparator.LT_OR_EQ]: 'lte',
        [Comparator.GT]: 'gt',
        [Comparator.GT_OR_EQ]: 'gte',
      };

      const rangeProperty = comparatorToRangePropertyMapping[comparator];

      return {
        range: {
          [field]: {
            [rangeProperty]: value,
          },
        },
      };
    }
    default: {
      return undefined;
    }
  }
};

const getPositiveComparators = () => {
  return [
    Comparator.GT,
    Comparator.GT_OR_EQ,
    Comparator.LT,
    Comparator.LT_OR_EQ,
    Comparator.EQ,
    Comparator.MATCH,
    Comparator.MATCH_PHRASE,
  ];
};

const getNegativeComparators = () => {
  return [Comparator.NOT_EQ, Comparator.NOT_MATCH, Comparator.NOT_MATCH_PHRASE];
};

const queryMappings: {
  [key: string]: string;
} = {
  [Comparator.GT]: 'range',
  [Comparator.GT_OR_EQ]: 'range',
  [Comparator.LT]: 'range',
  [Comparator.LT_OR_EQ]: 'range',
  [Comparator.EQ]: 'term',
  [Comparator.MATCH]: 'match',
  [Comparator.MATCH_PHRASE]: 'match_phrase',
  [Comparator.NOT_EQ]: 'term',
  [Comparator.NOT_MATCH]: 'match',
  [Comparator.NOT_MATCH_PHRASE]: 'match_phrase',
};

const getQueryMappingForComparator = (comparator: Comparator) => {
  return queryMappings[comparator];
};

const getResults = async (
  query: object,
  index: string,
  callCluster: AlertServices['callCluster']
) => {
  return await callCluster('count', {
    body: query,
    index,
  });
};

const createConditionsMessage = (criteria: LogDocumentCountAlertParams['criteria']) => {
  const parts = criteria.map((criterion, index) => {
    const { field, comparator, value } = criterion;
    return `${index === 0 ? '' : 'and'} ${field} ${comparator} ${value}`;
  });
  return parts.join(' ');
};

// When the Alerting plugin implements support for multiple action groups, add additional
// action groups here to send different messages, e.g. a recovery notification
export const FIRED_ACTIONS = {
  id: 'logs.threshold.fired',
  name: i18n.translate('xpack.infra.logs.alerting.threshold.fired', {
    defaultMessage: 'Fired',
  }),
};
