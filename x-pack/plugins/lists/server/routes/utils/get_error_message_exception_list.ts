/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const getErrorMessageExceptionList = ({
  id,
  listId,
}: {
  id: string | undefined;
  listId: string | undefined;
}): string => {
  if (id != null) {
    return `exception list id: "${id}" does not exist`;
  } else if (listId != null) {
    return `exception list list_id: "${listId}" does not exist`;
  } else {
    return 'exception list does not exist';
  }
};
