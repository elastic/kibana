/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { AlertExecutorOptions } from '../../../../../alerting/server';
import { AlertStates, Comparator, LogThresholdAlertParams } from './types';
import { InfraBackendLibs } from '../../infra_types';
import { getIntervalInSeconds } from '../../../utils/get_interval_in_seconds';

const checkValueAgainstComparatorMap = {
  [Comparator.GT]: (a: number, b: number) => a > b,
  [Comparator.GT_OR_EQ]: (a: number, b: number) => a >= b,
  [Comparator.LT]: (a: number, b: number) => a < b,
  [Comparator.LT_OR_EQ]: (a: number, b: number) => a <= b,
};

export const createLogThresholdExecutor = (alertUUID: string, libs: InfraBackendLibs) =>
  async function({ services, params }: AlertExecutorOptions) {
    const { timeSize, timeUnit, count, criteria } = params as LogThresholdAlertParams;
    const { alertInstanceFactory, savedObjectsClient, callCluster } = services;
    const { sources } = libs;

    const sourceConfiguration = await sources.getSourceConfiguration(savedObjectsClient, 'default');
    const indexPattern = sourceConfiguration.configuration.logAlias;

    const alertInstance = alertInstanceFactory(alertUUID);

    try {
      const query = getESQuery(params, sourceConfiguration.configuration);
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
    }
  };

const getESQuery = (params, sourceConfiguration) => {
  const { timeSize, timeUnit, count, criteria } = params as LogThresholdAlertParams;
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

const buildFiltersForCriteria = criteria => {
  let filters = [];
  criteria.forEach(criterion => {
    const criterionQuery = buildCriterionQuery(criterion);
    filters = [...filters, criterionQuery];
  });
  return filters;
};

const buildCriterionQuery = criterion => {
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
      const comparatorToRangePropertyMapping = {
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

const queryMappings = {
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

const getQueryMappingForComparator = comparator => {
  return queryMappings[comparator];
};

const getResults = async (query, index, callCluster) => {
  return await callCluster('count', {
    body: query,
    index,
  });
};

const createConditionsMessage = criteria => {
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
