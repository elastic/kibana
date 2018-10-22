/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import 'ngreact';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { checkBasicLicense } from 'plugins/ml/license/check_license';
import { checkFindFileStructurePrivilege } from 'plugins/ml/privilege/check_privilege';
import { getMlNodeCount } from 'plugins/ml/ml_nodes_check/check_ml_nodes';
import { loadNewJobDefaults } from 'plugins/ml/jobs/new_job/utils/new_job_defaults';
import { initPromise } from 'plugins/ml/util/promise';

import uiRoutes from 'ui/routes';

const template = '<ml-nav-menu name="filedatavisualizer" /><file-datavisualizer-page />';

uiRoutes
  .when('/filedatavisualizer/?', {
    template,
    resolve: {
      CheckLicense: checkBasicLicense,
      privileges: checkFindFileStructurePrivilege,
      mlNodeCount: getMlNodeCount,
      loadNewJobDefaults,
      initPromise: initPromise(true)
    }
  });



import { FileDataVisualizerPage } from './file_datavisualizer';

module.directive('fileDatavisualizerPage', function ($injector) {
  const reactDirective = $injector.get('reactDirective');
  const indexPatterns = $injector.get('indexPatterns');
  const kibanaConfig = $injector.get('config');


  return reactDirective(FileDataVisualizerPage, undefined, { restrict: 'E' }, { indexPatterns, kibanaConfig });
});
