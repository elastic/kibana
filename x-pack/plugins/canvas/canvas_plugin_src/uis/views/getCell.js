/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ViewStrings } from '../../../i18n';

const { GetCell: strings } = ViewStrings;

export const getCell = () => ({
  name: 'getCell',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  modelArgs: ['size'],
  requiresContext: true,
  args: [],
});
