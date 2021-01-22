/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';

export const addIdToItem = <T>(item: T, uuidGen: () => string = uuid.v4): T => {
  const maybeId: typeof item & { id?: string } = item;
  if (maybeId.id != null) {
    return item;
  } else {
    return { ...item, id: uuidGen() };
  }
};

export const removeIdFromItem = <T>(
  item: T
):
  | T
  | Pick<
      T & {
        id?: string | undefined;
      },
      Exclude<keyof T, 'id'>
    > => {
  const maybeId: typeof item & { id?: string } = item;
  if (maybeId.id != null) {
    const { id, ...noId } = maybeId;
    return noId;
  } else {
    return item;
  }
};
