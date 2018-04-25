/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map, filter, sortBy } from 'lodash';
import { uiModules } from 'ui/modules';
import template from './watch_type_select.html';
import 'angular-ui-select';
import { Watch } from 'plugins/watcher/models/watch';
import './watch_type_select.less';

const app = uiModules.get('xpack/watcher');

function getWatchTypes() {
  const allWatchTypes = map(Watch.getWatchTypes(), (WatchType, key) => {
    return {
      type: key,
      typeName: WatchType.typeName,
      iconClass: WatchType.iconClass,
      selectMessage: WatchType.selectMessage,
      sortOrder: WatchType.selectSortOrder,
      isCreatable: WatchType.isCreatable
    };
  });
  const fitleredWatchTypes = filter(allWatchTypes, watchType => watchType.isCreatable);
  const result = sortBy(fitleredWatchTypes, watchType => watchType.sortOrder);

  return result;
}

app.directive('watchTypeSelect', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      onChange: '='
    },
    controller: class ActionTypeSelectController {
      constructor($scope) {
        $scope.selectedItem = { value: null };

        $scope.watchTypes = getWatchTypes();

        $scope.onSelect = (watchType) => {
          $scope.onChange(watchType.type);
          $scope.selectedItem = { value: null };
        };
      }
    }
  };
});
