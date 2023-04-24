/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

interface TransformAliasSetting {
  alias: string;
  // When move_on_creation: true, all the other indices are removed from the alias,
  // ensuring that the alias points at only one index (i.e.: the destination index of the current transform).
  move_on_creation?: boolean;
}

export const getDestinationIndexAliases = (aliasSettings: unknown): TransformAliasSetting[] => {
  let aliases: TransformAliasSetting[] = [];

  if (!aliasSettings) return aliases;

  // Can be in form of {
  //   'alias1': null,
  //   'alias2': { move_on_creation: false }
  // }
  if (isPopulatedObject<string, { move_on_creation?: boolean }>(aliasSettings)) {
    Object.keys(aliasSettings).forEach((alias) => {
      if (aliasSettings.hasOwnProperty(alias) && typeof alias === 'string') {
        const moveOnCreation = aliasSettings[alias]?.move_on_creation === true;
        aliases.push({ alias, move_on_creation: moveOnCreation });
      }
    });
  }
  if (Array.isArray(aliasSettings)) {
    aliases = aliasSettings.reduce<TransformAliasSetting[]>((acc, alias) => {
      if (typeof alias === 'string') {
        acc.push({ alias, move_on_creation: alias.endsWith('.latest') ? true : false });
      }
      return acc;
    }, []);
  }
  if (typeof aliasSettings === 'string') {
    aliases = [
      { alias: aliasSettings, move_on_creation: aliasSettings.endsWith('.latest') ? true : false },
    ];
  }
  return aliases;
};
