/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, ApmFields, dedot } from '@kbn/apm-synthtrace';
import { getWaterfall } from '../../public/components/app/transaction_details/waterfall_with_summary/waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';
import { Span } from '../../typings/es_schemas/ui/span';
import { Transaction } from '../../typings/es_schemas/ui/transaction';
import { getCriticalPath } from './get_critical_path';

describe('getCriticalPath', () => {
  function getCriticalPathFromEvents(events: ApmFields[]) {
    const waterfall = getWaterfall(
      {
        traceDocs: events.map(
          (event) => dedot(event, {}) as Transaction | Span
        ),
        errorDocs: [],
        exceedsMax: false,
        linkedChildrenOfSpanCountBySpanId: {},
      },
      events[0]['transaction.id']!
    );

    return {
      waterfall,
      criticalPath: getCriticalPath(waterfall),
    };
  }
  it('adds the only active span to the critical path', () => {
    const a = apm.service('a', 'development', 'java').instance('a');

    const {
      criticalPath: { segments },
      waterfall,
    } = getCriticalPathFromEvents(
      a
        .transaction('/service-a')
        .timestamp(1)
        .duration(100)
        .children(a.span('foo', 'external', 'db').duration(100).timestamp(1))
        .serialize()
    );

    expect(segments).toEqual([
      { self: false, duration: 100000, item: waterfall.items[0], offset: 0 },
      { self: false, duration: 100000, item: waterfall.items[1], offset: 0 },
      { self: true, duration: 100000, item: waterfall.items[1], offset: 0 },
    ]);
  });

  it('adds the span that ended last', () => {
    const a = apm.service('a', 'development', 'java').instance('a');

    const {
      criticalPath: { segments },
      waterfall,
    } = getCriticalPathFromEvents(
      a
        .transaction('/service-a')
        .timestamp(1)
        .duration(100)
        .children(
          a.span('foo', 'external', 'db').duration(99).timestamp(1),
          a.span('bar', 'external', 'db').duration(100).timestamp(1)
        )
        .serialize()
    );

    const longerSpan = waterfall.items.find(
      (item) => (item.doc as Span).span?.name === 'bar'
    );

    expect(segments).toEqual([
      { self: false, duration: 100000, item: waterfall.items[0], offset: 0 },
      {
        self: false,
        duration: 100000,
        item: longerSpan,
        offset: 0,
      },
      { self: true, duration: 100000, item: longerSpan, offset: 0 },
    ]);
  });

  it('adds segment for uninstrumented gaps in the parent', () => {
    const a = apm.service('a', 'development', 'java').instance('a');

    const {
      criticalPath: { segments },
      waterfall,
    } = getCriticalPathFromEvents(
      a
        .transaction('/service-a')
        .timestamp(1)
        .duration(100)
        .children(a.span('foo', 'external', 'db').duration(50).timestamp(11))
        .serialize()
    );

    expect(
      segments.map((segment) => ({
        self: segment.self,
        duration: segment.duration,
        id: segment.item.id,
        offset: segment.offset,
      }))
    ).toEqual([
      { self: false, duration: 100000, id: waterfall.items[0].id, offset: 0 },
      {
        self: true,
        duration: 40000,
        id: waterfall.items[0].id,
        offset: 60000,
      },
      {
        self: false,
        duration: 50000,
        id: waterfall.items[1].id,
        offset: 10000,
      },
      {
        self: true,
        duration: 50000,
        id: waterfall.items[1].id,
        offset: 10000,
      },
      {
        self: true,
        duration: 10000,
        offset: 0,
        id: waterfall.items[0].id,
      },
    ]);
  });

  it('only considers a single child to be active at the same time', () => {
    const a = apm.service('a', 'development', 'java').instance('a');

    const {
      criticalPath: { segments },
      waterfall,
    } = getCriticalPathFromEvents(
      a
        .transaction('s1')
        .timestamp(1)
        .duration(100)
        .children(
          a.span('s2', 'external', 'db').duration(1).timestamp(1),
          a.span('s3', 'external', 'db').duration(1).timestamp(2),
          a.span('s4', 'external', 'db').duration(98).timestamp(3),
          a
            .span('s5', 'external', 'db')
            .duration(98)
            .timestamp(1)
            .children(
              a.span('s6', 'external', 'db').duration(30).timestamp(5),
              a.span('s7', 'external', 'db').duration(30).timestamp(35)
            )
        )
        .serialize()
    );

    const [_s1, s2, _s5, _s6, _s7, s3, s4] = waterfall.items;

    expect(
      segments
        .map((segment) => ({
          self: segment.self,
          duration: segment.duration,
          id: segment.item.id,
          offset: segment.offset,
        }))
        .filter((segment) => segment.self)
        .map((segment) => segment.id)
    ).toEqual([s4.id, s3.id, s2.id]);
  });

  // https://www.uber.com/en-NL/blog/crisp-critical-path-analysis-for-microservice-architectures/
  it('correctly returns the critical path for the CRISP example', () => {
    const a = apm.service('a', 'development', 'java').instance('a');

    const {
      criticalPath: { segments },
      waterfall,
    } = getCriticalPathFromEvents(
      a
        .transaction('s1')
        .timestamp(1)
        .duration(100)
        .children(
          a.span('s2', 'external', 'db').duration(25).timestamp(6),
          a
            .span('s3', 'external', 'db')
            .duration(50)
            .timestamp(41)
            .children(
              a.span('s4', 'external', 'db').duration(20).timestamp(61),
              a.span('s5', 'external', 'db').duration(30).timestamp(51)
            )
        )
        .serialize()
    );

    const [s1, s2, s3, s5, _s4] = waterfall.items;

    expect(
      segments
        .map((segment) => ({
          self: segment.self,
          duration: segment.duration,
          id: segment.item.id,
          offset: segment.offset,
        }))
        .filter((segment) => segment.self)
    ).toEqual([
      // T9-T10
      {
        self: true,
        duration: 10000,
        id: s1.id,
        offset: 90000,
      },
      // T8-T9
      {
        self: true,
        duration: 10000,
        id: s3.id,
        offset: 80000,
      },
      // T5-T8
      {
        self: true,
        duration: s5.duration,
        id: s5.id,
        offset: s5.offset,
      },
      // T4-T5
      {
        self: true,
        duration: 10000,
        id: s3.id,
        offset: 40000,
      },
      // T3-T4
      {
        self: true,
        duration: 10000,
        id: s1.id,
        offset: 30000,
      },
      // T2-T3
      {
        self: true,
        duration: 25000,
        id: s2.id,
        offset: 5000,
      },
      // T1-T2
      {
        duration: 5000,
        id: s1.id,
        offset: 0,
        self: true,
      },
    ]);
  });
});
