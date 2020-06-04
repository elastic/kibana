/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, isEmpty } from 'lodash/fp';
import { Filter, esKuery, KueryNode } from '../../../../../../../src/plugins/data/public';
import {
  DataProvider,
  DataProvidersAnd,
} from '../../../timelines/components/timeline/data_providers/data_provider';
import { Ecs } from '../../../graphql/types';

interface FindValueToChangeInQuery {
  field: string;
  valueToChange: string;
}

/**
 * Fields that will be replaced with the template strings from a a saved timeline template.
 * This is used for the alerts detection engine feature when you save a timeline template
 * and are the fields you can replace when creating a template.
 */
const templateFields = [
  'host.name',
  'host.hostname',
  'host.domain',
  'host.id',
  'host.ip',
  'client.ip',
  'destination.ip',
  'server.ip',
  'source.ip',
  'network.community_id',
  'user.name',
  'process.name',
];

/**
 * This will return an unknown as a string array if it exists from an unknown data type and a string
 * that represents the path within the data object the same as lodash's "get". If the value is non-existent
 * we will return an empty array. If it is a non string value then this will log a trace to the console
 * that it encountered an error and return an empty array.
 * @param field string of the field to access
 * @param data The unknown data that is typically a ECS value to get the value
 * @param localConsole The local console which can be sent in to make this pure (for tests) or use the default console
 */
export const getStringArray = (field: string, data: unknown, localConsole = console): string[] => {
  const value: unknown | undefined = get(field, data);
  if (value == null) {
    return [];
  } else if (typeof value === 'string') {
    return [value];
  } else if (Array.isArray(value) && value.every((element) => typeof element === 'string')) {
    return value;
  } else {
    localConsole.trace(
      'Data type that is not a string or string array detected:',
      value,
      'when trying to access field:',
      field,
      'from data object of:',
      data
    );
    return [];
  }
};

export const findValueToChangeInQuery = (
  kueryNode: KueryNode,
  valueToChange: FindValueToChangeInQuery[] = []
): FindValueToChangeInQuery[] => {
  let localValueToChange = valueToChange;
  if (kueryNode.function === 'is' && templateFields.includes(kueryNode.arguments[0].value)) {
    localValueToChange = [
      ...localValueToChange,
      {
        field: kueryNode.arguments[0].value,
        valueToChange: kueryNode.arguments[1].value,
      },
    ];
  }
  return kueryNode.arguments.reduce(
    (addValueToChange: FindValueToChangeInQuery[], ast: KueryNode) => {
      if (ast.function === 'is' && templateFields.includes(ast.arguments[0].value)) {
        return [
          ...addValueToChange,
          {
            field: ast.arguments[0].value,
            valueToChange: ast.arguments[1].value,
          },
        ];
      }
      if (ast.arguments) {
        return findValueToChangeInQuery(ast, addValueToChange);
      }
      return addValueToChange;
    },
    localValueToChange
  );
};

export const replaceTemplateFieldFromQuery = (query: string, ecsData: Ecs): string => {
  if (query.trim() !== '') {
    const valueToChange = findValueToChangeInQuery(esKuery.fromKueryExpression(query));
    return valueToChange.reduce((newQuery, vtc) => {
      const newValue = getStringArray(vtc.field, ecsData);
      if (newValue.length) {
        return newQuery.replace(vtc.valueToChange, newValue[0]);
      } else {
        return newQuery;
      }
    }, query);
  } else {
    return '';
  }
};

export const replaceTemplateFieldFromMatchFilters = (filters: Filter[], ecsData: Ecs): Filter[] =>
  filters.map((filter) => {
    if (
      filter.meta.type === 'phrase' &&
      filter.meta.key != null &&
      templateFields.includes(filter.meta.key)
    ) {
      const newValue = getStringArray(filter.meta.key, ecsData);
      if (newValue.length) {
        filter.meta.params = { query: newValue[0] };
        filter.query = { match_phrase: { [filter.meta.key]: newValue[0] } };
      }
    }
    return filter;
  });

export const reformatDataProviderWithNewValue = <T extends DataProvider | DataProvidersAnd>(
  dataProvider: T,
  ecsData: Ecs
): T => {
  if (templateFields.includes(dataProvider.queryMatch.field)) {
    const newValue = getStringArray(dataProvider.queryMatch.field, ecsData);
    if (newValue.length) {
      dataProvider.id = dataProvider.id.replace(dataProvider.name, newValue[0]);
      dataProvider.name = newValue[0];
      dataProvider.queryMatch.value = newValue[0];
      dataProvider.queryMatch.displayField = undefined;
      dataProvider.queryMatch.displayValue = undefined;
    }
  }
  return dataProvider;
};

export const replaceTemplateFieldFromDataProviders = (
  dataProviders: DataProvider[],
  ecsData: Ecs
): DataProvider[] =>
  dataProviders.map((dataProvider) => {
    const newDataProvider = reformatDataProviderWithNewValue(dataProvider, ecsData);
    if (newDataProvider.and != null && !isEmpty(newDataProvider.and)) {
      newDataProvider.and = newDataProvider.and.map((andDataProvider) =>
        reformatDataProviderWithNewValue(andDataProvider, ecsData)
      );
    }
    return newDataProvider;
  });
