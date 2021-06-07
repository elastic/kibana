/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_STATUS } from '@kbn/rule-data-utils/target/technical_field_names';
import * as queries from './queries';

describe('queries', () => {
  describe('alertStatusQuery', () => {
    describe('given "all"', () => {
      it('returns an empty array', () => {
        expect(queries.alertStatusQuery('all')).toEqual([]);
      });
    });

    describe('given "open"', () => {
      it('returns a query for open', () => {
        expect(queries.alertStatusQuery('open')).toEqual([
          {
            term: { [ALERT_STATUS]: 'open' },
          },
        ]);
      });
    });

    describe('given "closed"', () => {
      it('returns a query for closed', () => {
        expect(queries.alertStatusQuery('closed')).toEqual([
          {
            term: { [ALERT_STATUS]: 'closed' },
          },
        ]);
      });
    });
  });
});
