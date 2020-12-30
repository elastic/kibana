/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';

import { DEFAULT_INDEX_PATTERN } from '../../../common/constants';
import { Direction } from '../../graphql/types';
import { RequestOptions } from '../../lib/framework';

import { Args, Configuration, createOptions, FieldNodes } from './create_options';

describe('createOptions', () => {
  let source: Configuration;
  let args: Args;
  let info: FieldNodes;
  beforeEach(() => {
    source = {
      configuration: {
        fields: {
          host: 'host-1',
          container: 'container-1',
          message: ['message-1'],
          pod: 'pod-1',
          tiebreaker: 'tiebreaker',
          timestamp: 'timestamp-1',
        },
      },
    };
    args = {
      defaultIndex: DEFAULT_INDEX_PATTERN,
      pagination: {
        limit: 5,
      },
      docValueFields: [
        {
          field: '@timestamp',
          format: 'date_time',
        },
        {
          field: 'event.end',
          format: 'date_time',
        },
      ],
      timerange: {
        from: '2020-07-08T08:00:00.000Z',
        to: '2020-07-08T20:00:00.000Z',
        interval: '12 hours ago',
      },
      sortField: { sortFieldId: 'sort-1', direction: Direction.asc },
    };
    info = {
      fieldNodes: [
        {
          name: {
            kind: 'Name',
            value: 'value-1',
          },
          kind: 'Field',
        },
      ],
    };
  });

  test('should create options given all input including sort field', () => {
    const options = createOptions(source, args, info);
    const expected: RequestOptions = {
      defaultIndex: DEFAULT_INDEX_PATTERN,
      sourceConfiguration: {
        fields: {
          host: 'host-1',
          container: 'container-1',
          message: ['message-1'],
          pod: 'pod-1',
          tiebreaker: 'tiebreaker',
          timestamp: 'timestamp-1',
        },
      },
      sortField: { sortFieldId: 'sort-1', direction: Direction.asc },
      pagination: {
        limit: 5,
      },
      filterQuery: {},
      docValueFields: [
        {
          field: '@timestamp',
          format: 'date_time',
        },
        {
          field: 'event.end',
          format: 'date_time',
        },
      ],
      fields: [],
      timerange: {
        from: '2020-07-08T08:00:00.000Z',
        to: '2020-07-08T20:00:00.000Z',
        interval: '12 hours ago',
      },
    };
    expect(options).toEqual(expected);
  });

  test('should create options given all input except sorting', () => {
    const argsWithoutSort: Args = omit('sortField', args);
    const options = createOptions(source, argsWithoutSort, info);
    const expected: RequestOptions = {
      defaultIndex: DEFAULT_INDEX_PATTERN,
      sourceConfiguration: {
        fields: {
          host: 'host-1',
          container: 'container-1',
          message: ['message-1'],
          pod: 'pod-1',
          tiebreaker: 'tiebreaker',
          timestamp: 'timestamp-1',
        },
      },
      pagination: {
        limit: 5,
      },
      filterQuery: {},
      docValueFields: [
        {
          field: '@timestamp',
          format: 'date_time',
        },
        {
          field: 'event.end',
          format: 'date_time',
        },
      ],
      fields: [],
      timerange: {
        from: '2020-07-08T08:00:00.000Z',
        to: '2020-07-08T20:00:00.000Z',
        interval: '12 hours ago',
      },
    };
    expect(options).toEqual(expected);
  });

  test('should create options given all input except docValueFields', () => {
    const argsWithoutSort: Args = omit('docValueFields', args);
    const options = createOptions(source, argsWithoutSort, info);
    const expected: RequestOptions = {
      defaultIndex: DEFAULT_INDEX_PATTERN,
      sourceConfiguration: {
        fields: {
          host: 'host-1',
          container: 'container-1',
          message: ['message-1'],
          pod: 'pod-1',
          tiebreaker: 'tiebreaker',
          timestamp: 'timestamp-1',
        },
      },
      sortField: { sortFieldId: 'sort-1', direction: Direction.asc },
      pagination: {
        limit: 5,
      },
      filterQuery: {},
      docValueFields: [],
      fields: [],
      timerange: {
        from: '2020-07-08T08:00:00.000Z',
        to: '2020-07-08T20:00:00.000Z',
        interval: '12 hours ago',
      },
    };
    expect(options).toEqual(expected);
  });
});
