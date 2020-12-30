/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './zoom.scss';

import { TransitionStrings } from '../../../i18n';

const { zoom: strings } = TransitionStrings;

export const zoom = () => ({
  name: 'zoom',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  enter: 'zoomIn',
  exit: 'zoomOut',
});
