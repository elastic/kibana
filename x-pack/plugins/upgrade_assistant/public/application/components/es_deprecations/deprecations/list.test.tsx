/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { EnrichedDeprecationInfo } from '../../../../../common/types';
import { GroupByOption } from '../../types';
import { EsDeprecationList } from './list';

describe('EsDeprecationList', () => {
  describe('group by message', () => {
    const defaultProps = {
      deprecations: [
        { message: 'Issue 1', url: '', level: 'warning' },
        { message: 'Issue 1', url: '', level: 'warning' },
      ] as EnrichedDeprecationInfo[],
      currentGroupBy: GroupByOption.message,
    };

    test('shows simple messages when index field is not present', () => {
      expect(shallow(<EsDeprecationList {...defaultProps} />)).toMatchInlineSnapshot(`
        <div>
          <SimpleMessageDeprecation
            deprecation={
              Object {
                "level": "warning",
                "message": "Issue 1",
                "url": "",
              }
            }
            key="Issue 1-0"
          />
          <SimpleMessageDeprecation
            deprecation={
              Object {
                "level": "warning",
                "message": "Issue 1",
                "url": "",
              }
            }
            key="Issue 1-1"
          />
        </div>
      `);
    });

    test('shows index deprecation when index field is present', () => {
      // Add index fields to deprecation items
      const props = {
        ...defaultProps,
        deprecations: defaultProps.deprecations.map((d, index) => ({
          ...d,
          index: index.toString(),
        })),
      };
      const wrapper = shallow(<EsDeprecationList {...props} />);
      expect(wrapper).toMatchInlineSnapshot(`
        <IndexDeprecation
          deprecation={
            Object {
              "index": "0",
              "level": "warning",
              "message": "Issue 1",
              "url": "",
            }
          }
          indices={
            Array [
              Object {
                "blockerForReindexing": undefined,
                "deprecatedIndexSettings": undefined,
                "details": undefined,
                "index": "0",
                "reindex": false,
              },
              Object {
                "blockerForReindexing": undefined,
                "deprecatedIndexSettings": undefined,
                "details": undefined,
                "index": "1",
                "reindex": false,
              },
            ]
          }
        />
      `);
    });
  });

  describe('group by index', () => {
    const defaultProps = {
      deprecations: [
        { message: 'Issue 1', index: 'index1', url: '', level: 'warning' },
        { message: 'Issue 2', index: 'index1', url: '', level: 'warning' },
      ] as EnrichedDeprecationInfo[],
      currentGroupBy: GroupByOption.index,
    };

    test('shows detailed messages', () => {
      expect(shallow(<EsDeprecationList {...defaultProps} />)).toMatchInlineSnapshot(`
        <div>
          <MessageDeprecation
            deprecation={
              Object {
                "index": "index1",
                "level": "warning",
                "message": "Issue 1",
                "url": "",
              }
            }
            key="Issue 1-0"
          />
          <MessageDeprecation
            deprecation={
              Object {
                "index": "index1",
                "level": "warning",
                "message": "Issue 2",
                "url": "",
              }
            }
            key="Issue 2-1"
          />
        </div>
      `);
    });
  });
});
