/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Given a name and index this will return the pattern of "${name_${index}"
 * @param name The name to suffix the string
 * @param index The index to suffix the string
 * @returns The pattern "${name_${index}"
 */
export const getSavedObjectNamePattern = ({
  name,
  index,
}: {
  name: string;
  index: number;
}): string => `${name}_${index}`;
