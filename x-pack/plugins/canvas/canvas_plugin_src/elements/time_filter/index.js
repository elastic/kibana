/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import header from './header.png';

export const timeFilter = () => ({
  name: 'time_filter',
  displayName: 'Time filter',
  help: 'Set a time window',
  image: header,
  height: 50,
  expression: `timefilterControl compact=true column=@timestamp
| render`,
  filter: 'timefilter column=@timestamp from=now-24h to=now',
});
