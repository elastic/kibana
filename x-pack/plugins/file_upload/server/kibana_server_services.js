/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

let internalRepository;
export const setInternalRepository = (createInternalRepository) => {
  internalRepository = createInternalRepository();
};
export const getInternalRepository = () => internalRepository;
