/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_ID } from '../../../common/constants';
import { mergeExecutionContext } from './execution_context_utils';

describe('mergeExecutionContext', () => {

  test('should merge with context',  () => {
    const mergeContext = { description: 'es_pew_pew_source:connections' };
    const context = { name: APP_ID };
    expect(mergeExecutionContext(mergeContext, context)).toEqual({
      description: 'es_pew_pew_source:connections',
      name: APP_ID,
    });
  });

  test('should merge with hierarchical context',  () => {
    const mergeContext = { description: 'es_pew_pew_source:connections' };
    const context = {
      name: 'dashboard',
      child: {
        name: APP_ID
      }
    };
    expect(mergeExecutionContext(mergeContext, context)).toEqual({
      name: 'dashboard',
      child: {
        description: 'es_pew_pew_source:connections',
        name: APP_ID,
      }
    });
  });

  test('should not merge if "maps" context can not be found',  () => {
    const mergeContext = { description: 'es_pew_pew_source:connections' };
    const context = {
      name: 'dashboard',
      child: {
        name: 'lens'
      }
    };
    expect(mergeExecutionContext(mergeContext, context)).toEqual({
      name: 'dashboard',
      child: {
        name: 'lens',
      }
    });
  });

});