/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PaginationBuilder } from './pagination';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import { EndpointEvent } from '../../../../../common/endpoint/types';

describe('Pagination', () => {
  const generator = new EndpointDocGenerator();

  const getSearchAfterInfo = (events: EndpointEvent[]) => {
    const lastEvent = events[events.length - 1];
    return [lastEvent['@timestamp'], lastEvent.event.id];
  };
  describe('cursor', () => {
    const root = generator.generateEvent();
    const events = Array.from(generator.relatedEventsGenerator(root, 5));

    it('does not build a cursor when all events are present', () => {
      expect(PaginationBuilder.buildCursor(0, events)).toBeNull();
    });

    it('creates a cursor when not all events are present', () => {
      expect(PaginationBuilder.buildCursor(events.length + 1, events)).not.toBeNull();
    });

    it('creates a cursor with the right information', () => {
      const cursor = PaginationBuilder.buildCursor(events.length + 1, events);
      expect(cursor).not.toBeNull();
      // we are guaranteed that the cursor won't be null from the check above
      const builder = PaginationBuilder.createBuilder(0, cursor!);
      const fields = builder.buildQueryFields(0, '', '');
      expect(fields.search_after).toStrictEqual(getSearchAfterInfo(events));
    });
  });

  describe('pagination builder', () => {
    it('does not include the search after information when no cursor is provided', () => {
      const builder = PaginationBuilder.createBuilder(100);
      const fields = builder.buildQueryFields(1, '', '');
      expect(fields).not.toHaveProperty('search_after');
    });

    it('returns no results when the aggregation does not exist in the response', () => {
      expect(PaginationBuilder.getTotals()).toStrictEqual({});
    });

    it('constructs the totals from the aggregation results', () => {
      const agg = {
        totals: {
          buckets: [
            {
              key: 'awesome',
              doc_count: 5,
            },
            {
              key: 'soup',
              doc_count: 1,
            },
          ],
        },
      };
      expect(PaginationBuilder.getTotals(agg)).toStrictEqual({ awesome: 5, soup: 1 });
    });
  });
});
