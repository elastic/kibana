/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, SetStateAction } from 'react';

export const toggleSelectedGroup = (
  group: string,
  selectedGroups: string[],
  setSelectedGroups: Dispatch<SetStateAction<string[]>>
): void => {
  const selectedGroupIndex = selectedGroups.indexOf(group);
  const updatedSelectedGroups = [...selectedGroups];
  if (selectedGroupIndex >= 0) {
    updatedSelectedGroups.splice(selectedGroupIndex, 1);
  } else {
    updatedSelectedGroups.push(group);
  }
  setSelectedGroups(updatedSelectedGroups);
};
