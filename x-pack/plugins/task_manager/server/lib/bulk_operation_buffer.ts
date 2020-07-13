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

export interface OperationError<H, E> {
  entity: H;
  error: E;
}

export type OperationResult<H, E> = Result<H, OperationError<H, E>>;

export type Operation<H, E> = (entity: H) => Promise<Result<H, E>>;
export type BulkOperation<H, E> = (entities: H[]) => Promise<Array<OperationResult<H, E>>>;

export function createBuffer<H extends Entity, E>(
  bulkOperation: BulkOperation<H, E>
): Operation<H, E> {
  const flushBuffer = new Subject<void>();
  const storeUpdateBuffer = new Subject<{
    entity: H;
    onSuccess: (entity: Ok<H>) => void;
    onFailure: (error: Err<E>) => void;
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
              ({ entity, error }: OperationError<H, E>) => {
                entityById[entity.id].onFailure(asErr(error));
              }
            )
          );
        })
        .catch((ex) => {
          entities.forEach(({ onFailure }) => onFailure(asErr(ex)));
        });
    });

  return async function (entity: H) {
    return new Promise((resolve, reject) => {
      // ensure we flush by the end of the "current" event loop tick
      setImmediate(() => flushBuffer.next());
      storeUpdateBuffer.next({ entity, onSuccess: resolve, onFailure: reject });
    });
  };
}
