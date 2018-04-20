/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import ReactDOM from 'react-dom';
import { ClusterView } from '../components/clusterView';
import { uiModules } from 'ui/modules';

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('clusterView', kbnUrl => {
  return {
    restrict: 'E',
    scope: {
      totalCount: '=',
      filter: '=',
      showing: '=',
      labels: '=',
      shardStats: '=',
      showSystemIndices: '=',
      toggleShowSystemIndices: '='
    },
    link: function (scope, element) {
      ReactDOM.render(
        <ClusterView
          scope={scope}
          kbnUrl={kbnUrl}
          showSystemIndices={scope.showSystemIndices}
          toggleShowSystemIndices={scope.toggleShowSystemIndices}
        />,
        element[0]
      );
    }
  };
});
