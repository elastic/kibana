/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function getFieldNames(names, arg) {
  if (arg.args != null) {
    return names.concat(arg.args.reduce(getFieldNames, []));
  }

  if (typeof arg === 'string') {
    return names.concat(arg);
  }

  return names;
}
