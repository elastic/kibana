/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PaginationBuilder } from './pagination';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import { SafeEndpointEvent } from '../../../../../common/endpoint/types';
import {
  eventIDSafeVersion,
  timestampSafeVersion,
} from '../../../../../common/endpoint/models/event';

describe('Pagination', () => {
  const generator = new EndpointDocGenerator();

  const getSearchAfterInfo = (events: SafeEndpointEvent[]) => {
    const lastEvent = events[events.length - 1];
    return [timestampSafeVersion(lastEvent), eventIDSafeVersion(lastEvent)];
  };
  describe('cursor', () => {
    const root = generator.generateEvent();
    const events = Array.from(
      generator.relatedEventsGenerator({ node: root, relatedEvents: 5, sessionEntryLeader: 'test' })
    );

    it('does build a cursor when received the same number of events as was requested', () => {
      expect(PaginationBuilder.buildCursorRequestLimit(4, events)).not.toBeNull();
    });

    it('does not create a cursor when the number of events received is less than the amount requested', () => {
      expect(PaginationBuilder.buildCursorRequestLimit(events.length + 1, events)).toBeNull();
    });

    it('creates a cursor with the right information', () => {
      const cursor = PaginationBuilder.buildCursorRequestLimit(events.length, events);
      expect(cursor).not.toBeNull();
      // we are guaranteed that the cursor won't be null from the check above
      const builder = PaginationBuilder.createBuilder(0, cursor!);
      const fields = builder.buildQueryFields('');
      expect(fields.search_after).toStrictEqual(getSearchAfterInfo(events));
    });
  });

  describe('pagination builder', () => {
    it('does not include the search after information when no cursor is provided', () => {
      const builder = PaginationBuilder.createBuilder(100);
      const fields = builder.buildQueryFields('');
      expect(fields).not.toHaveProperty('search_after');
    });

    it('creates the sort field in ascending order', () => {
      const builder = PaginationBuilder.createBuilder(100);
      expect(builder.buildQueryFields('a').sort).toContainEqual({ '@timestamp': 'asc' });
      expect(builder.buildQueryFields('', 'asc').sort).toContainEqual({ '@timestamp': 'asc' });
    });

    it('creates the sort field in descending order', () => {
      const builder = PaginationBuilder.createBuilder(100);
      expect(builder.buildQueryFields('a', 'desc').sort).toStrictEqual([
        { '@timestamp': 'desc' },
        { a: 'asc' },
      ]);
    });
  });
});
