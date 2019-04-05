/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

require('../../../../src/legacy/ui/public/styles/bootstrap_light.less');

// Pull in the built CSS produced by the Kibana server
const css = require.context('../../../../built_assets/css', true, /light.css$/);
css.keys().forEach(filename => css(filename));

// Include the legacy styles
const uiStyles = require.context(
  '../../../../src/legacy/ui/public/styles',
  false,
  /[\/\\](?!mixins|variables|_|\.|bootstrap_(light|dark))[^\/\\]+\.less/
);
uiStyles.keys().forEach(key => uiStyles(key));
