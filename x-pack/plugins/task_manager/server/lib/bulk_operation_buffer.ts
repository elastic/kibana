/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { keyBy, map } from 'lodash';
import { Subject, race, from } from 'rxjs';
import { bufferWhen, filter, bufferCount, flatMap, mapTo, first } from 'rxjs/operators';
import { either, Result, asOk, asErr, Ok, Err } from './result_type';

export interface BufferOptions {
  bufferMaxDuration?: number;
  bufferMaxOperations?: number;
}

export interface Entity {
  id: string;
}

export interface OperationError<Input, ErrorOutput> {
  entity: Input;
  error: ErrorOutput;
}

export type OperationResult<Input, ErrorOutput, Output = Input> = Result<
  Output,
  OperationError<Input, ErrorOutput>
>;

export type Operation<Input, ErrorOutput, Output = Input> = (
  entity: Input
) => Promise<Result<Output, ErrorOutput>>;

export type BulkOperation<Input, ErrorOutput, Output = Input> = (
  entities: Input[]
) => Promise<Array<OperationResult<Input, ErrorOutput, Output>>>;

const DONT_FLUSH = false;
const FLUSH = true;

export function createBuffer<Input extends Entity, ErrorOutput, Output extends Entity = Input>(
  bulkOperation: BulkOperation<Input, ErrorOutput, Output>,
  { bufferMaxDuration = 0, bufferMaxOperations = Number.MAX_VALUE }: BufferOptions = {}
): Operation<Input, ErrorOutput, Output> {
  const flushBuffer = new Subject<void>();

  const storeUpdateBuffer = new Subject<{
    entity: Input;
    onSuccess: (entity: Ok<Output>) => void;
    onFailure: (error: Err<ErrorOutput>) => void;
  }>();

  storeUpdateBuffer
    .pipe(
      bufferWhen(() => flushBuffer),
      filter((tasks) => tasks.length > 0)
    )
    .subscribe((entities) => {
      const entityById = keyBy(entities, ({ entity: { id } }) => id);
      bulkOperation(map(entities, 'entity'))
        .then((results) => {
          results.forEach((result) =>
            either(
              result,
              (entity) => {
                entityById[entity.id].onSuccess(asOk(entity));
              },
              ({ entity, error }: OperationError<Input, ErrorOutput>) => {
                entityById[entity.id].onFailure(asErr(error));
              }
            )
          );
        })
        .catch((ex) => {
          entities.forEach(({ onFailure }) => onFailure(asErr(ex)));
        });
    });

  let countInBuffer = 0;
  const flushAndResetCounter = () => {
    countInBuffer = 0;
    flushBuffer.next();
  };
  storeUpdateBuffer
    .pipe(
      // complete once the buffer has either filled to `bufferMaxOperations` or
      // a `bufferMaxDuration` has passed. Default to `bufferMaxDuration` being the
      // current event loop tick rather than a fixed duration
      flatMap(() => {
        return ++countInBuffer === 1
          ? race([
              // the race is started in response to the first operation into the buffer
              // so we flush once the remaining operations come in (which is `bufferMaxOperations - 1`)
              storeUpdateBuffer.pipe(bufferCount(bufferMaxOperations - 1)),
              // flush buffer once max duration has passed
              from(resolveIn(bufferMaxDuration)),
            ]).pipe(first(), mapTo(FLUSH))
          : from([DONT_FLUSH]);
      }),
      filter((shouldFlush) => shouldFlush)
    )
    .subscribe({
      next: flushAndResetCounter,
      // As this stream is just trying to decide when to flush
      // there's no data to lose, so in the case that an error
      // is thrown, lets just flush
      error: flushAndResetCounter,
    });

  return async function (entity: Input) {
    return new Promise((resolve, reject) => {
      storeUpdateBuffer.next({ entity, onSuccess: resolve, onFailure: reject });
    });
  };
}

function resolveIn(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
