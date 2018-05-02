/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import 'ngreact';

import { InfluencersCell } from './influencers_cell';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);
module.directive('mlInfluencersCell', function (reactDirective) {
  return reactDirective(InfluencersCell, undefined, { restrict: 'E' });
});
