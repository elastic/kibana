/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ViewStrings } from '../../../i18n';
const { DropdownControl: strings } = ViewStrings;

export const dropdownControl = () => ({
  name: 'dropdownControl',
  displayName: strings.getDisplayName(),
  modelArgs: [],
  args: [
    {
      name: 'valueColumn',
      displayName: strings.getValueDisplayName(),
      help: strings.getValueHelp(),
      argType: 'string',
      options: {
        confirm: 'Set',
      },
    },
    {
      name: 'filterColumn',
      displayName: strings.getFilterDisplayName(),
      help: strings.getFilterHelp(),
      argType: 'string',
      options: {
        confirm: 'Set',
      },
    },
    {
      name: 'filterGroup',
      displayName: strings.getFilterGroupDisplayName(),
      help: strings.getFilterGroupHelp(),
      argType: 'filterGroup',
    },
  ],
});
