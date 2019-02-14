/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { WatchActionControllerBase } from '../lib/watch_action_controller_base';
import template from './watch_hipchat_action.html';
import 'plugins/watcher/services/html_id_generator';
import 'ui/directives/input_focus';
import 'plugins/watcher/components/xpack_aria_describes';

const app = uiModules.get('xpack/watcher');

app.directive('watchHipchatAction', function ($injector) {
  const htmlIdGeneratorFactory = $injector.get('xpackWatcherHtmlIdGeneratorFactory');

  return {
    restrict: 'E',
    template: template,
    bindToController: true,
    controllerAs: 'watchHipchatAction',
    controller: class WatchHipchatActionController extends WatchActionControllerBase {
      constructor($scope) {
        super($scope);

        this.makeId = htmlIdGeneratorFactory.create(this.action.id);

        this.room = this.action.message.room.join(',');

        $scope.$watch('watchHipchatAction.message.room', (roomList) => {
          const roomArray = (roomList || '').split(',').map(room => room.trim());
          this.room = roomArray.join(', ');

          this.action.message.room = roomArray;
        });
        this.user = this.action.message.user.join(',');

        $scope.$watch('watchHipchatAction.message.user', (userList) => {
          const userArray = (userList || '').split(',').map(user => user.trim());
          this.user = userArray.join(', ');

          this.action.message.user = userArray;
        });

        $scope.$watchGroup([
          'action.message.user',
          'action.message.body',
          'action.message.notify',
          'action.message.format',
          'action.message.color',
          'action.message.room',
          'action.account',
          'action.proxy.host',
          'action.proxy.port',
        ], () => { this.onChange(this.action); });
      }
    }
  };
});
