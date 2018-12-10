/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import header from './header.png';

export const dropdownFilter = () => ({
  name: 'dropdown_filter',
  displayName: 'Dropdown filter',
  help: 'A dropdown from which you can select values for an "exactly" filter',
  image: header,
  height: 50,
  expression: `demodata
| dropdownControl valueColumn=project filterColumn=project | render`,
  filter: '',
});
