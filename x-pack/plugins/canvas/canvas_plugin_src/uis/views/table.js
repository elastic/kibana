/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ViewStrings } from '../../../i18n';

const { Table: strings } = ViewStrings;

export const table = () => ({
  name: 'table',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  modelArgs: [],
  args: [
    {
      name: 'font',
      argType: 'font',
    },
    {
      name: 'perPage',
      displayName: strings.getPerPageDisplayName(),
      help: strings.getPerPageHelp(),
      argType: 'select',
      default: 10,
      options: {
        choices: ['', 5, 10, 25, 50, 100].map((v) => ({ name: String(v), value: v })),
      },
    },
    {
      name: 'paginate',
      displayName: strings.getPaginateDisplayName(),
      help: strings.getPaginateHelp(),
      argType: 'toggle',
      default: true,
      options: {
        labelValue: strings.getPaginateToggleSwitch(),
      },
    },
    {
      name: 'showHeader',
      displayName: strings.getShowHeaderDisplayName(),
      help: strings.getShowHeaderHelp(),
      argType: 'toggle',
      default: true,
      options: {
        labelValue: strings.getShowHeaderToggleSwitch(),
      },
    },
  ],
});
