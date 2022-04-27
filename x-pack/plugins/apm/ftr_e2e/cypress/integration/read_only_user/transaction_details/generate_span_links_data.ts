/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  apm,
  ApmFields,
  EntityArrayIterable,
  timerange,
} from '@elastic/apm-synthtrace';
import uuid from 'uuid';
import { synthtrace } from '../../../../synthtrace';

function generateExternalSpanLinks() {
  return Array(2)
    .fill(0)
    .map(() => ({ span: { id: uuid() }, trace: { id: uuid() } }));
}

function getSpanLinksFromEvents(events: ApmFields[]) {
  return events
    .map((event) => {
      const spanId = event['span.id'];
      return spanId
        ? { span: { id: spanId }, trace: { id: event['trace.id'] } }
        : undefined;
    })
    .filter((_) => _) as Array<{
    span: { id: string };
    trace?: { id: string };
  }>;
}

export async function generateSpanLinksData({
  from,
  to,
}: {
  from: number;
  to: number;
}) {
  const externalSpanLinks = generateExternalSpanLinks();

  const instanceJava = apm
    .service('synth-apple', 'production', 'java')
    .instance('instance-a');

  const appleEvents = timerange(from, to)
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      return instanceJava
        .transaction('GET /apple 🍏')
        .timestamp(timestamp)
        .duration(1000)
        .success()
        .children(
          instanceJava
            .span('get_green_apple_🍏', 'db', 'elasticsearch')
            .defaults({ 'span.links': externalSpanLinks })
            .timestamp(timestamp + 50)
            .duration(900)
            .success()
        );
    });

  const appleEventsAsArray = appleEvents.toArray();
  const bananaIncomingSpanLinks = getSpanLinksFromEvents(appleEventsAsArray);

  const instanceRuby = apm
    .service('synth-banana', 'production', 'ruby')
    .instance('instance-b');

  const outgoingEvents = timerange(from, to)
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      return instanceRuby
        .transaction('GET /banana 🍌')
        .timestamp(timestamp)
        .duration(1000)
        .success()
        .children(
          instanceRuby
            .span('get_banana_🍌', 'resource', 'css')
            .defaults({ 'span.links': bananaIncomingSpanLinks })
            .timestamp(timestamp + 50)
            .duration(900)
            .success()
        );
    });
  await synthtrace.index(
    new EntityArrayIterable(appleEventsAsArray).merge(outgoingEvents)
  );
}
