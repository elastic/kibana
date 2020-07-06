/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// This file defines CSS and Legacy style contexts for use in the DLL.  This file
// is also require'd in the Storybook config so that the Storybook Webpack instance
// is aware of them, and can load them from the DLL.

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

// Include Legacy styles
const uiStyles = require.context(
  '../../../../src/legacy/ui/public/styles',
  false,
  /[\/\\](?!mixins|variables|_|\.|bootstrap_(light|dark))[^\/\\]+\.less/
);
uiStyles.keys().forEach(key => uiStyles(key));

const json = require.context('../shareable_runtime/test/workpads', false, /\.json$/);
json.keys().forEach(key => json(key));
