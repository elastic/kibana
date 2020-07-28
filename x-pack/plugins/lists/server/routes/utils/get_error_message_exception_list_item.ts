/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const getErrorMessageExceptionListItem = ({
  id,
  itemId,
}: {
  id: string | undefined;
  itemId: string | undefined;
}): string => {
  if (id != null) {
    return `Exception list item id: "${id}" does not exist`;
  } else if (itemId != null) {
    return `Exception list item list_id: "${itemId}" does not exist`;
  } else {
    return 'Exception list item does not exist';
  }
};
