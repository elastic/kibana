/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import { get } from 'lodash';

const getFieldType = (
  key: string | undefined | null,
  indexMappings: FleetActionsIndexMapping
): string => {
  const mappingKey = `properties.${key}.type`;
  return key != null ? get(indexMappings, mappingKey) : '';
};

export const isFieldDefined = (
  indexMappings: FleetActionsIndexMapping | FleetActionsResultsIndexMapping,
  key: string
): boolean => {
  const mappingKey = 'properties.' + key;
  return typeof get(indexMappings, mappingKey) !== 'undefined';
};

export const hasFieldKeyError = (
  key: string | null | undefined,
  fieldTypes: string[],
  indexMapping: FleetActionsIndexMapping | FleetActionsResultsIndexMapping,
  indexType: IndexType
): string | null => {
  const allowedKeys = Object.keys(indexMapping.properties).join();
  if (key == null) {
    return `The key is empty and should be one of [${allowedKeys}]`;
  }
  if (key) {
    const allowedFieldTypes = fieldTypes.every((type) =>
      indexType === 'actions'
        ? ALLOWED_FLEET_ACTIONS_FIELD_TYPES.includes(type)
        : ALLOWED_FLEET_ACTIONS_RESULTS_FIELD_TYPES.includes(type)
    );
    if (!isFieldDefined(indexMapping, key)) {
      return `This key '${key}' does NOT exist in [${allowedKeys}] .fleet-actions* index patterns`;
    }
    if (!allowedFieldTypes) {
      return `This key '${key}' does NOT match field types [${ALLOWED_FLEET_ACTIONS_FIELD_TYPES.join()}] in .fleet-actions* index patterns`;
    }
  }
  return null;
};

export const ALLOWED_FLEET_ACTIONS_RESULTS_FIELD_TYPES = ['keyword'];
export const ALLOWED_FLEET_ACTIONS_FIELD_TYPES = ['keyword', 'date'];

export interface FleetActionsIndexMapping {
  properties: {
    action_id: {
      type: 'keyword';
    };
    agents: {
      type: 'keyword';
    };
    input_type: {
      type: 'keyword';
    };
    '@timestamp': {
      type: 'date';
    };
    type: {
      type: 'keyword';
    };
    user_id: {
      type: 'keyword';
    };
  };
}

export interface FleetActionsResultsIndexMapping {
  properties: {
    action_id: {
      type: 'keyword';
    };
    agent_id: {
      type: 'keyword';
    };
  };
}

export const allowedFleetActionsFields = Object.freeze({
  properties: {
    action_id: {
      type: 'keyword',
    },
    agents: {
      type: 'keyword',
    },
    input_type: {
      type: 'keyword',
    },
    '@timestamp': {
      type: 'date',
    },
    type: {
      type: 'keyword',
    },
    user_id: {
      type: 'keyword',
    },
  },
}) as FleetActionsIndexMapping;

export const allowedFleetActionsResultsFields = Object.freeze({
  properties: {
    action_id: {
      type: 'keyword',
    },
    agent_id: {
      type: 'keyword',
    },
  },
}) as FleetActionsResultsIndexMapping;

interface ValidateFilterKueryNode {
  astPath: string;
  error: string;
  isSavedObjectAttr: boolean;
  key: string;
  type: string | null;
}

export type IndexType = 'actions' | 'results';

interface ValidateFilterKueryNodeParams {
  astFilter: KueryNode;
  types: string[];
  indexMapping: FleetActionsIndexMapping;
  indexType?: IndexType;
  path?: string;
}

export const validateFilterKueryNode = ({
  astFilter,
  types,
  indexMapping,
  indexType = 'actions',
  path = 'arguments',
}: ValidateFilterKueryNodeParams): ValidateFilterKueryNode[] => {
  return astFilter.arguments.reduce((kueryNode: string[], ast: KueryNode, index: number) => {
    if (ast.arguments) {
      const myPath = `${path}.${index}`;
      return [
        ...kueryNode,
        ...validateFilterKueryNode({
          astFilter: ast,
          types,
          indexMapping,
          path: `${myPath}.arguments`,
        }),
      ];
    }

    if (index === 0) {
      const splitPath = path.split('.');
      return [
        ...kueryNode,
        {
          astPath: splitPath.slice(0, splitPath.length - 1).join('.'),
          error: hasFieldKeyError(ast.value, types, indexMapping, indexType),
          key: ast.value,
          type: getFieldType(ast.value, indexMapping),
        },
      ];
    }

    return kueryNode;
  }, []);
};
