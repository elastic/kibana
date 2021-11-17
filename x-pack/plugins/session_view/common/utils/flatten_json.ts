/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const flattenJSON = (data: any) => {
  const result: any = {};
  function recurse(cur: any, prop: string) {
    if (Object(cur) !== cur) {
      result[prop] = cur;
    } else if (Array.isArray(cur)) {
      for (let i = 0; i < cur.length; i++) recurse(cur[i], prop + '[' + i + ']');
      if (cur.length === 0) result[prop] = [];
    } else {
      let isEmpty = true;
      for (const p in cur) {
        if ({}.hasOwnProperty.call(cur, p)) {
          isEmpty = false;
          recurse(cur[p], prop ? prop + '.' + p : p);
        }
      }
      if (isEmpty) result[prop] = {};
    }
  }
  recurse(data, '');
  return result;
};
