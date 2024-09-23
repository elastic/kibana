/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocalStorage } from '@kbn/observability-utils-browser/hooks/use_local_storage';
import { useCallback, useRef } from 'react';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { compact, isArray } from 'lodash';
import { MetricDefinition, MetricDefinitionCreate } from '../../common/metrics';

interface FindMetricDefinitionsOptions {
  filter: Array<Pick<QueryDslQueryContainer, 'term' | 'terms'>>;
}

interface BulkCreateOperation {
  create: MetricDefinitionCreate;
}
interface BulkDeleteOperation {
  delete: {};
  id: string;
}
interface BulkUpdateOperation {
  update: MetricDefinition;
  id: string;
}

type BulkOperation = BulkCreateOperation | BulkUpdateOperation | BulkDeleteOperation;

interface UseMetricDefinitionsAPI {
  addMetricDefinition(definition: MetricDefinitionCreate): Promise<MetricDefinition>;
  deleteMetricDefinition(id: string): Promise<void>;
  findMetricDefinitions(options: FindMetricDefinitionsOptions): Promise<MetricDefinition[]>;
  bulk(operations: BulkOperation[]): Promise<void>;
}

export function useMetricDefinitions(): UseMetricDefinitionsAPI {
  const [metricDefinitions, setMetricDefinitions] = useLocalStorage(
    'inventory.entityMetricDefinitions',
    [] as MetricDefinition[]
  );

  const addMetricDefinition = useCallback(
    (metricDefinition: MetricDefinitionCreate) => {
      setMetricDefinitions(metricDefinitions.concat(metricDefinition));
      return Promise.resolve(metricDefinition);
    },
    [setMetricDefinitions, metricDefinitions]
  );

  const deleteMetricDefinition = useCallback(
    (id: string) => {
      const next = metricDefinitions.filter((def) => def.id !== id);
      setMetricDefinitions(next);
      return Promise.resolve();
    },
    [setMetricDefinitions, metricDefinitions]
  );

  const metricDefinitionsRef = useRef(metricDefinitions);

  metricDefinitionsRef.current = metricDefinitions;

  const findMetricDefinitions = useCallback(async (options: FindMetricDefinitionsOptions) => {
    const filtersAsSet = compact(
      options.filter.map((query) => {
        const queryBody = query.terms || query.term;
        if (queryBody) {
          const { boost, _name, ...fields } = queryBody;
          const field = Object.keys(fields)[0];
          const termValue = queryBody[field];
          return {
            field,
            values: new Set(isArray(termValue) ? termValue : [termValue]),
          };
        }
        return undefined;
      })
    );

    return metricDefinitionsRef.current.filter((definition) => {
      return filtersAsSet.every((filter) => {
        const value = definition.properties[filter.field];
        if (isArray(value)) {
          return value.some((val) => filter.values.has(val));
        }
        return filter.values.has(value);
      });
    });
  }, []);

  const bulk = useCallback(
    async (operations: BulkOperation[]) => {
      const idsToDelete = new Set(
        operations.filter((op): op is BulkDeleteOperation => 'delete' in op).map((op) => op.id)
      );
      const updates = new Map(
        operations
          .filter((op): op is BulkUpdateOperation => 'update' in op)
          .map((op) => [op.id, op.update])
      );

      const creates = operations.filter((op): op is BulkCreateOperation => 'create' in op);

      setMetricDefinitions(
        metricDefinitionsRef.current
          .filter((def) => !idsToDelete.has(def.id))
          .map((def) => {
            return updates.get(def.id) || def;
          })
          .concat(
            creates.map((create) => ({
              ...create.create,
            }))
          )
      );
    },
    [setMetricDefinitions]
  );

  return {
    addMetricDefinition,
    deleteMetricDefinition,
    findMetricDefinitions,
    bulk,
  };
}
