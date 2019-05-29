/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { i18n } from '@kbn/i18n';
import template from './action_status_table.html';

const app = uiModules.get('xpack/watcher');

app.directive('actionStatusTable', function () {
  return {
    restrict: 'E',
    replace: true,
    template: template,
    scope: {
      actionStatuses: '=',
      actionErrors: '=',
      sortField: '=',
      sortReverse: '=',
      onSortChange: '=',
      onActionAcknowledge: '=',
      showErrors: '='
    },
    bindToController: true,
    controllerAs: 'actionStatusTable',
    controller: class ActionStatusTableController {
      getLabelErrors(actionId) {
        const errors = this.actionErrors[actionId];
        const total = errors.length;

        const label = i18n.translate('xpack.watcher.sections.watchDetail.actionStatusTotalErrors', {
          defaultMessage: '{total, number} {total, plural, one {error} other {errors}}',
          values: {
            total,
          }
        });

        return label;
      }
    }
  };
});
