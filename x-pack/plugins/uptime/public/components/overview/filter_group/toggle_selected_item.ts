/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, SetStateAction } from 'react';

export const toggleSelectedItems = (
  item: string,
  tempSelectedItems: string[],
  setTempSelectedItems: Dispatch<SetStateAction<string[]>>
) => {
  const index = tempSelectedItems.indexOf(item);
  const nextSelectedItems = [...tempSelectedItems];
  if (index >= 0) {
    nextSelectedItems.splice(index, 1);
  } else {
    nextSelectedItems.push(item);
  }
  setTempSelectedItems(nextSelectedItems);
};
