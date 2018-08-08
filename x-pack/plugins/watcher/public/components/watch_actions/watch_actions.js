/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { find, remove, map, difference, forEach } from 'lodash';
import { uiModules } from 'ui/modules';
import template from './watch_actions.html';
import './components/watch_action';
import './watch_actions.less';
import 'plugins/watcher/components/action_type_select';

const app = uiModules.get('xpack/watcher');

app.directive('watchActions', function () {
  return {
    restrict: 'E',
    replace: true,
    template: template,
    scope: {
      actions: '=',
      onActionAdd: '=',
      onActionChange: '=',
      onActionSimulate: '=',
      onActionDelete: '=',
      onValid: '=',
      onInvalid: '='
    },
    bindToController: true,
    controllerAs: 'watchActions',
    controller: class WatchActionsController {
      constructor($scope) {
        this.items = [];

        $scope.$watch('watchActions.actions', (newVal) => {
          if (!Boolean(newVal)) {
            return;
          }

          this.items = map(newVal, action => {
            return {
              action,
              isCollapsed: true,
              isValid: true
            };
          });
          this.checkValidity();
        });
      }

      onToggle = (action) => {
        const item = find(this.items, { action });
        item.isCollapsed = !item.isCollapsed;
      }

      onDelete = (action) => {
        this.onActionDelete(action);

        const item = find(this.items, { action });
        remove(this.items, item);

        this.checkValidity();
      }

      onActionTypeChange = (type) => {
        this.onActionAdd(type);

        const oldActions = map(this.items, item => item.action);
        const newActions = difference(this.actions, oldActions);

        forEach(newActions, action => {
          this.items.push({
            action,
            isCollapsed: false
          });
        });
      }

      checkValidity = () => {
        const isValid = this.items.length === 0 || this.items.every(i => i.isValid);

        if (isValid) {
          this.onValid(this.action);
        } else {
          this.onInvalid(this.action);
        }
      }

      onActionValid = (action) => {
        const item = find(this.items, { action });
        item.isValid = true;

        this.checkValidity();
      }

      onActionInvalid = (action) => {
        const item = find(this.items, { action });
        item.isValid = false;

        this.checkValidity();
      }
    }
  };
});
