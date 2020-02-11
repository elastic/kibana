/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockLegacyEvents } from './tests/utils';
import { transformResults } from './common';
import { SearchResponse } from 'elasticsearch';
import { ResolverEvent } from '../../../common/types';

describe('transform results', () => {
  it('handles some results correctly', () => {
    const events = createMockLegacyEvents(3, 'process_event', 'still_running');
    const { total, lastDocument, results } = transformResults(
      (events as unknown) as SearchResponse<ResolverEvent>
    );
    expect(results.length).toBe(3);
    expect(lastDocument).toBe(events.hits.hits[2]._id);
    expect(total).toBe(3);
  });

  it('handles empty results correctly', () => {
    const events = createMockLegacyEvents(0, 'process_event', 'still_running');
    const { total, lastDocument, results } = transformResults(
      (events as unknown) as SearchResponse<ResolverEvent>
    );
    expect(results.length).toBe(0);
    expect(lastDocument).toBeNull();
    expect(total).toBe(0);
  });
});
