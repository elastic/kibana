/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { keyBy, map } from 'lodash';
import { Subject } from 'rxjs';
import { bufferWhen, filter } from 'rxjs/operators';
import { either, Result, asOk, asErr, Ok, Err } from './result_type';

export interface Entity {
  id: string;
}

export interface OperationError<Input, ErrorOutput> {
  entity: Input;
  error: ErrorOutput;
}

export type OperationResult<Input, Output, ErrorOutput> = Result<
  Output,
  OperationError<Input, ErrorOutput>
>;

export type Operation<Input, Output, ErrorOutput> = (
  entity: Input
) => Promise<Result<Output, ErrorOutput>>;
export type BulkOperation<Input, Output, ErrorOutput> = (
  entities: Input[]
) => Promise<Array<OperationResult<Input, Output, ErrorOutput>>>;

export function createBuffer<Input extends Entity, Output extends Entity, ErrorOutput>(
  bulkOperation: BulkOperation<Input, Output, ErrorOutput>
): Operation<Input, Output, ErrorOutput> {
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

  return async function (entity: Input) {
    return new Promise((resolve, reject) => {
      // ensure we flush by the end of the "current" event loop tick
      setImmediate(() => flushBuffer.next());
      storeUpdateBuffer.next({ entity, onSuccess: resolve, onFailure: reject });
    });
  };
}
