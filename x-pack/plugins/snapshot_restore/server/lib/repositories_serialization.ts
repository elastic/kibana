/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { camelCase } from 'lodash';
import { Repository } from '../../common/repository_types';

export function deserializeRepository(name: string, repository: Repository): object {
  const repositorySettings = Object.keys(repository.settings).reduce(
    (settings: { [key: string]: any }, settingName: string) => {
      settings[camelCase(settingName)] = repository.settings[settingName];
      return settings;
    },
    {}
  );

  return {
    name,
    ...repositorySettings,
  };
}
