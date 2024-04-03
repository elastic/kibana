/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JSONValue } from '../types';

export interface StreamPart<CODE extends string, NAME extends string, TYPE> {
  code: CODE;
  name: NAME;
  parse: (value: JSONValue) => { type: NAME; value: TYPE };
}

type StreamParts =
  | typeof textStreamPart
  | typeof errorStreamPart
  | typeof messageAnnotationsStreamPart;
/**
 * Maps the type of a stream part to its value type.
 */
type StreamPartValueType = {
  [P in StreamParts as P['name']]: ReturnType<P['parse']>['value'];
};

export type StreamPartType =
  | ReturnType<typeof textStreamPart.parse>
  | ReturnType<typeof errorStreamPart.parse>
  | ReturnType<typeof messageAnnotationsStreamPart.parse>;

const NEWLINE = '\n'.charCodeAt(0);

const concatChunks = (chunks: Uint8Array[], totalLength: number) => {
  const concatenatedChunks = new Uint8Array(totalLength);

  let offset = 0;
  for (const chunk of chunks) {
    concatenatedChunks.set(chunk, offset);
    offset += chunk.length;
  }
  chunks.length = 0;

  return concatenatedChunks;
};

export async function* readDataStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  { isAborted }: { isAborted?: () => boolean } = {}
): AsyncGenerator<StreamPartType> {
  const decoder = new TextDecoder();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { value } = await reader.read();

    if (value) {
      chunks.push(value);
      totalLength += value.length;
      if (value[value.length - 1] !== NEWLINE) {
        continue;
      }
    }

    if (chunks.length === 0) {
      break;
    }

    const concatenatedChunks = concatChunks(chunks, totalLength);
    totalLength = 0;

    const streamParts = decoder
      .decode(concatenatedChunks, { stream: true })
      .split('\n')
      .filter((line) => line !== '')
      .map(parseStreamPart);

    for (const streamPart of streamParts) {
      yield streamPart;
    }

    if (isAborted?.()) {
      reader.cancel();
      break;
    }
  }
}

const createStreamPart = <CODE extends string, NAME extends string, TYPE>(
  code: CODE,
  name: NAME,
  parse: (value: JSONValue) => { type: NAME; value: TYPE }
): StreamPart<CODE, NAME, TYPE> => {
  return {
    code,
    name,
    parse,
  };
};

const textStreamPart = createStreamPart('0', 'text', (value) => {
  if (typeof value !== 'string') {
    throw new Error('"text" parts expect a string value.');
  }
  return { type: 'text', value };
});

const errorStreamPart = createStreamPart('3', 'error', (value) => {
  if (typeof value !== 'string') {
    throw new Error('"error" parts expect a string value.');
  }
  return { type: 'error', value };
});

const messageAnnotationsStreamPart = createStreamPart('8', 'message_annotations', (value) => {
  if (!Array.isArray(value)) {
    throw new Error('"message_annotations" parts expect an array value.');
  }

  return { type: 'message_annotations', value };
});

const streamParts = [textStreamPart, errorStreamPart, messageAnnotationsStreamPart] as const;

type StreamPartMap = {
  [P in StreamParts as P['code']]: P;
};

const streamPartsByCode: StreamPartMap = streamParts.reduce(
  (acc, part) => ({
    ...acc,
    [part.code]: part,
  }),
  {} as StreamPartMap
);

const validCodes = streamParts.map((part) => part.code);

export const parseStreamPart = (line: string): StreamPartType => {
  const firstSeparatorIndex = line.indexOf(':');

  if (firstSeparatorIndex === -1) {
    throw new Error('Failed to parse stream string. No separator found.');
  }

  const prefix = line.slice(0, firstSeparatorIndex) as keyof StreamPartMap;

  if (!validCodes.includes(prefix)) {
    throw new Error(`Failed to parse stream string. Invalid code ${prefix}.`);
  }

  const code = prefix as keyof StreamPartMap;

  const textValue = line.slice(firstSeparatorIndex + 1);
  const jsonValue: JSONValue = JSON.parse(textValue);

  return streamPartsByCode[code].parse(jsonValue);
};

export const formatStreamPart = <T extends keyof StreamPartValueType>(
  type: T,
  value: StreamPartValueType[T]
): string => {
  const streamPart = streamParts.find((part) => part.name === type);

  if (!streamPart) {
    throw new Error(`Invalid stream part type: ${type as string}`);
  }

  return `${streamPart.code}:${JSON.stringify(value)}\n`;
};
