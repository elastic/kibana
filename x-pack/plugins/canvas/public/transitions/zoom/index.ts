/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransitionStrings } from '../../../i18n';

const { zoom: strings } = TransitionStrings;

export const zoom = () => ({
  name: 'zoom',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  enter: 'zoomIn',
  exit: 'zoomOut',
});
