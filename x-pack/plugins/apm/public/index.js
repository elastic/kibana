/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createHistory from 'history/createHashHistory';
const history = createHistory();

history.listen((location, action) => {
  console.log({ location, action }); // eslint-disable-line no-console
});
