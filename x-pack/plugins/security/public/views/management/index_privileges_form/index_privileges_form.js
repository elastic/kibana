/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { uiModules } from 'ui/modules';
import template from './index_privileges_form.html';

const module = uiModules.get('security', ['kibana']);
module.directive('kbnIndexPrivilegesForm', function () {
  return {
    template,
    scope: {
      isNewRole: '=',
      indices: '=',
      indexPatterns: '=',
      privileges: '=',
      fieldOptions: '=',
      isReserved: '=',
      isEnabled: '=',
      allowDocumentLevelSecurity: '=',
      allowFieldLevelSecurity: '=',
      addIndex: '&',
      removeIndex: '&',
    },
    restrict: 'E',
    replace: true,
    controllerAs: 'indexPrivilegesController',
    controller: function ($scope) {
      this.addIndex = function addIndex() {
        $scope.addIndex({ indices: $scope.indices });
      };

      this.removeIndex = function removeIndex(index) {
        $scope.removeIndex({ indices: $scope.indices, index });
      };

      this.getIndexTitle = function getIndexTitle(index) {
        const indices = index.names.length ? index.names.join(', ') : 'No indices';
        const privileges = index.privileges.length ? index.privileges.join(', ') : 'No privileges';
        return `${indices} (${privileges})`;
      };

      this.union = _.flow(_.union, _.compact);

      // If editing an existing role while that has been disabled, always show the FLS/DLS fields because currently
      // a role is only marked as disabled if it has FLS/DLS setup (usually before the user changed to a license that
      // doesn't permit FLS/DLS).
      if (!$scope.isNewRole && !$scope.isEnabled) {
        this.showDocumentLevelSecurity = true;
        this.showFieldLevelSecurity = true;
      } else {
        this.showDocumentLevelSecurity = $scope.allowDocumentLevelSecurity;
        this.showFieldLevelSecurity = $scope.allowFieldLevelSecurity;
      }
    },
  };
});
