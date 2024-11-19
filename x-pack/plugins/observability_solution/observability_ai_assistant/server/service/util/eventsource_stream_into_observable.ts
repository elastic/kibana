/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createParser } from 'eventsource-parser';
import { Readable } from 'node:stream';
import { Observable } from 'rxjs';

// OpenAI sends server-sent events, so we can use a library
// to deal with parsing, buffering, unicode etc

export function eventsourceStreamIntoObservable(readable: Readable) {
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
