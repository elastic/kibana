/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import 'ngreact';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { InfluencersList } from './influencers_list';

module.directive('mlInfluencersList', function ($injector) {
  const reactDirective = $injector.get('reactDirective');

  return reactDirective(
    InfluencersList,
    undefined,
    { restrict: 'E' }
  );
});
