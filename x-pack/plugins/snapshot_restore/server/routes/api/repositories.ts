/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const getAll = {
  path: 'repositories',
  method: 'get',
  handler: async (req: any, callWithRequest: any, responseToolkit: any) => {
    const repositoriesByName = await callWithRequest('snapshot.getRepository', {
      repository: '_all',
    });
    const repositories = Object.keys(repositoriesByName).map(name => {
      return {
        name,
        ...repositoriesByName[name],
      };
    });
    return repositories;
  },
};

export const getOne = {
  path: 'repositories/{name}',
  method: 'get',
  handler: async (req: any, callWithRequest: any, responseToolkit: any) => {
    const { name } = req.params;
    const repositoryByName = await callWithRequest('snapshot.getRepository', { repository: name });
    if (repositoryByName[name]) {
      return repositoryByName[name];
    } else {
      return {};
    }
  },
};
