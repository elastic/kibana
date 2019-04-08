/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Pull in the built CSS produced by the Kibana server, but not
// the Canvas CSS-- we want that in the HMR service.
const css = require.context(
  '../../../../built_assets/css',
  true,
  /\.\/plugins\/(?!canvas).*light\.css/
);
css.keys().forEach(filename => {
  css(filename);
});

// Include the legacy styles
const uiStyles = require.context(
  '../../../../src/legacy/ui/public/styles',
  false,
  /[\/\\](?!mixins|variables|_|\.|bootstrap_(light|dark))[^\/\\]+\.less/
);
uiStyles.keys().forEach(key => uiStyles(key));
