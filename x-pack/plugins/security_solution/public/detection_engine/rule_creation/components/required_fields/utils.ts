/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function pickTypeForName(
  currentName: string,
  currentType: string,
  typesByFieldName: Record<string, string[] | undefined>
) {
  const typesAvailableForNewName = typesByFieldName[currentName] || [];
  const isCurrentTypeAvailableForNewName = typesAvailableForNewName.includes(currentType);

  /* First try to keep the current type if it's available for the new name */
  if (isCurrentTypeAvailableForNewName) {
    return currentType;
  }

  /*
    If current type is not available, pick the first available type.
    If no type is available, use the currently selected type.
  */
  return typesAvailableForNewName?.[0] ?? currentType;
}
