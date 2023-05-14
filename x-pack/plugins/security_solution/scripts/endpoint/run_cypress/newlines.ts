/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const addNewlineAtEveryNChar = (str, n) => {
  if (!str) {
    return str;
  }

  const result = [];
  let idx = 0;

  while (idx < str.length) {
    result.push(str.slice(idx, (idx += n)));
  }

  return result.join('\n');
};

module.exports = {
  addNewlineAtEveryNChar,
};
