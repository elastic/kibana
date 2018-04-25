/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { find } from 'lodash';
import { uiModules } from 'ui/modules';
import { InitAfterBindingsWorkaround } from 'ui/compat';
import template from './watch_history_item_actions_summary.html';
import 'plugins/watcher/components/action_state_icon';

const app = uiModules.get('xpack/watcher');

app.directive('watchHistoryItemActionsSummary', function () {
  return {
    restrict: 'E',
    replace: true,
    template: template,
    scope: {
      watch: '=xpackWatch', // Property names differ due to https://git.io/vSWXV
      watchHistoryItem: '=',
    },
    bindToController: true,
    controllerAs: 'watchHistoryItemActionsSummary',
    controller: class WatchHistoryItemActionsSummaryController extends InitAfterBindingsWorkaround {
      initAfterBindings() {
        const actions = this.watch.actions;
        const actionStatuses = this.watchHistoryItem.watchStatus.actionStatuses;

        this.actionDetails = actions.map(action => {
          const actionStatus = find(actionStatuses, { id: action.id });

          return {
            action,
            actionStatus
          };
        });
      }
    }
  };
});
