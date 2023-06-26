/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as esKuery from '@kbn/es-query';

import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '../../../common';

import {
  validateFilterKueryNode,
  allowedFleetActionsFields,
  allowedFleetActionsResultsFields,
  isFieldDefined,
  hasFieldKeyError,
  type IndexType,
} from './utils';

describe('utils', () => {
  describe('#validateFilterKueryNode', () => {
    it('should accept only allowed search fields', () => {
      const validationObject = validateFilterKueryNode({
        astFilter: esKuery.fromKueryExpression(
          'action_id: "1" or action_id: "2" and (input_type: "endpoint" and @timestamp <= "now" and @timestamp >= "now-2d")'
        ),
        types: ['keyword', 'date'],
        indexMapping: allowedFleetActionsFields,
      });

      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          key: 'action_id',
          type: 'keyword',
        },
        {
          astPath: 'arguments.1.arguments.0',
          error: null,
          key: 'action_id',
          type: 'keyword',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.0',
          error: null,
          key: 'input_type',
          type: 'keyword',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1',
          error: null,
          key: '@timestamp',
          type: 'date',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.2',
          error: null,
          key: '@timestamp',
          type: 'date',
        },
      ]);
    });

    it('should not accept if any search fields are not allowed', () => {
      const validationObject = validateFilterKueryNode({
        astFilter: esKuery.fromKueryExpression(
          'action_id: "1" and expiration: "2023-06-21T10:55:36.481Z" and (input_type: "endpoint" and @timestamp <= "now" and @timestamp >= "now-2d")'
        ),
        types: ['keyword', 'date'],
        indexMapping: allowedFleetActionsFields,
      });

      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          key: 'action_id',
          type: 'keyword',
        },
        {
          astPath: 'arguments.1',
          error: "This key 'expiration' does not exist in .fleet-actions index mappings",
          key: 'expiration',
          type: undefined,
        },
        {
          astPath: 'arguments.2.arguments.0',
          error: null,
          key: 'input_type',
          type: 'keyword',
        },
        {
          astPath: 'arguments.2.arguments.1',
          error: null,
          key: '@timestamp',
          type: 'date',
        },
        {
          astPath: 'arguments.2.arguments.2',
          error: null,
          key: '@timestamp',
          type: 'date',
        },
      ]);
    });
  });

  describe('#hasFieldKeyError', () => {
    describe.each([
      [AGENT_ACTIONS_INDEX, 'actions', ['keyword', 'date']],
      [AGENT_ACTIONS_RESULTS_INDEX, 'results', ['keyword']],
    ])('%s', (indexName, indexType, fieldTypes) => {
      it('Return no error if filter key is valid', () => {
        const hasError = hasFieldKeyError(
          'action_id',
          fieldTypes,
          indexType === 'actions' ? allowedFleetActionsFields : allowedFleetActionsResultsFields,
          indexType as IndexType
        );

        expect(hasError).toBeNull();
      });

      it('Return error if filter key is valid but type is not', () => {
        const hasError = hasFieldKeyError(
          'action_id',
          ['text', 'integer'],
          indexType === 'actions' ? allowedFleetActionsFields : allowedFleetActionsResultsFields,
          indexType as IndexType
        );

        expect(hasError).toEqual(
          `This key 'action_id' does not match allowed field types in ${indexName} index mappings`
        );
      });

      it('Return error if key is not defined', () => {
        const hasError = hasFieldKeyError(
          undefined,
          ['integer'],
          indexType === 'actions' ? allowedFleetActionsFields : allowedFleetActionsResultsFields,
          indexType as IndexType
        );

        const errorMessage =
          indexType === 'actions'
            ? '[action_id,agents,input_type,@timestamp,type,user_id]'
            : '[action_id,agent_id]';
        expect(hasError).toEqual(`The key is empty and should be one of ${errorMessage}`);
      });

      it('Return error if key is null', () => {
        const hasError = hasFieldKeyError(
          null,
          ['text'],
          indexType === 'actions' ? allowedFleetActionsFields : allowedFleetActionsResultsFields,
          indexType as IndexType
        );

        const errorMessage =
          indexType === 'actions'
            ? '[action_id,agents,input_type,@timestamp,type,user_id]'
            : '[action_id,agent_id]';
        expect(hasError).toEqual(`The key is empty and should be one of ${errorMessage}`);
      });
    });
  });

  describe('#isFieldDefined', () => {
    it('Return false if kuery is using an non-existing key', () => {
      const _isFieldDefined = isFieldDefined(allowedFleetActionsFields, 'not_a_key');

      expect(_isFieldDefined).toBeFalsy();
    });

    it.each(['action_id', 'agents', 'input_type', '@timestamp', 'type', 'user_id'])(
      'Return true if kuery is using an existing key %s',
      (key) => {
        const _isFieldDefined = isFieldDefined(allowedFleetActionsFields, key);

        expect(_isFieldDefined).toBeTruthy();
      }
    );
  });
});
