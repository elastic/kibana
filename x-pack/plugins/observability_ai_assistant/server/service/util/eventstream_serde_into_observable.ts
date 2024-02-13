/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventStreamMarshaller } from '@smithy/eventstream-serde-node';
import { fromUtf8, toUtf8 } from '@smithy/util-utf8';
import { identity } from 'lodash';
import { Observable } from 'rxjs';
import { Readable } from 'stream';
import { Message } from '@smithy/types';

interface ModelStreamErrorException {
  name: 'ModelStreamErrorException';
  originalStatusCode?: number;
  originalMessage?: string;
}

export interface BedrockChunkMember {
  chunk: Message;
}

export interface ModelStreamErrorExceptionMember {
  modelStreamErrorException: ModelStreamErrorException;
}

export type BedrockStreamMember = BedrockChunkMember | ModelStreamErrorExceptionMember;

// AWS uses SerDe to send over serialized data, so we use their
// @smithy library to parse the stream data

export function eventstreamSerdeIntoObservable(readable: Readable) {
  return new Observable<BedrockStreamMember>((subscriber) => {
    const marshaller = new EventStreamMarshaller({
      utf8Encoder: toUtf8,
      utf8Decoder: fromUtf8,
    });

    async function processStream() {
      for await (const chunk of marshaller.deserialize(readable, identity)) {
        if (chunk) {
          subscriber.next(chunk as BedrockStreamMember);
        }
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
