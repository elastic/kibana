/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// the tooltip descriptions are located in tooltips.json

import './styles/main.less';

import { metadata } from 'ui/metadata';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlDocumentationHelpLink', function () {
  return {
    scope: {
      uri: '@mlUri',
      label: '@mlLabel'
    },
    restrict: 'AE',
    replace: true,
    template: '<a href="{{fullUrl()}}" rel="noopener noreferrer" target="_blank"' +
                'class="documentation-help-link" tooltip="{{label}}">' +
                '{{label}}<i class="fa fa-external-link"></i></a>',
    controller: function ($scope) {
      const baseUrl = 'https://www.elastic.co';
      // metadata.branch corresponds to the version used in documentation links.
      const version = metadata.branch;

      $scope.fullUrl = function () {
        return `${baseUrl}/guide/en/x-pack/${version}/${$scope.uri}`;
      };
    }
  };

});
