/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './zoom.css';

export const zoom = () => ({
  name: 'zoom',
  displayName: 'Zoom',
  help: 'Zoom from one page to the next',
  enter: 'zoomIn',
  exit: 'zoomOut',
});
