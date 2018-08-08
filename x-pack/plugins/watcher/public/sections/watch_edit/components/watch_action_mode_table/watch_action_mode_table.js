/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map, get, values, set } from 'lodash';
import { uiModules } from 'ui/modules';
import template from './watch_action_mode_table.html';
import { getActionType } from 'plugins/watcher/../common/lib/get_action_type';
import { ACTION_MODES } from 'plugins/watcher/../common/constants';

const app = uiModules.get('xpack/watcher');

app.directive('watchActionModeTable', function () {
  return {
    restrict: 'E',
    replace: true,
    template: template,
    scope: {
      watch: '=xpackWatch', // Property names differ due to https://git.io/vSWXV
      onChange: '='
    },
    bindToController: true,
    controllerAs: 'watchActionModeTable',
    controller: class WatchActionModeTableController {
      constructor($scope) {
        $scope.$watch('watchActionModeTable.watch.watch', () => {
          this.populateActionCollection();
          this.onActionModeChange();
        });

        this.actionModes = values(ACTION_MODES);
      }

      populateActionCollection() {
        const actions = get(this.watch, 'watch.actions');

        this.actionOptions = map(actions, (action, actionId) => {
          const type = getActionType(action);
          return {
            actionId,
            type,
            actionMode: ACTION_MODES.SIMULATE
          };
        });
      }

      onActionModeChange() {
        const result = {};
        this.actionOptions.forEach(actionOption => {
          set(result, actionOption.actionId, actionOption.actionMode);
        });
        this.onChange(result);
      }
    }
  };
});
