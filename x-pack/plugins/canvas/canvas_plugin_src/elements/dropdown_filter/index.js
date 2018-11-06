/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import header from './header.png';

export const dropdownFilter = () => ({
  name: 'dropdown_filter',
  displayName: i18n.translate('xpack.canvas.elements.dropdownFilterDisplayName', {
    defaultMessage: 'Dropdown filter',
  }),
  help: i18n.translate('xpack.canvas.elements.dropdownFilterHelpText', {
    defaultMessage: 'A dropdown from which you can select values for an "exactly" filter',
  }),
  image: header,
  height: 50,
  expression: `demodata
| dropdownControl valueColumn=project filterColumn=project | render`,
  filter: '',
});
