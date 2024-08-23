/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'node:stream';
import { createParser } from 'eventsource-parser';
import { Observable } from 'rxjs';

export function eventSourceStreamIntoObservable(readable: Readable) {
  return new Observable<string>((subscriber) => {
    const parser = createParser((event) => {
      if (event.type === 'event') {
        subscriber.next(event.data);
      }
    });

    async function processStream() {
      for await (const chunk of readable) {
        parser.feed(chunk.toString());
      }
    }

    processStream().then(
      () => {
        subscriber.complete();
      },
      (error) => {
        subscriber.error(error);
      }
    );
  });
}
