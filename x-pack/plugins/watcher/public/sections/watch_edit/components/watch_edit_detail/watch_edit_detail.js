/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import template from './watch_edit_detail.html';
import './watch_edit_detail.less';
import 'plugins/watcher/components/json_editor';
import { documentationLinks } from 'plugins/watcher/lib/documentation_links';

const app = uiModules.get('xpack/watcher');

app.directive('watchEditDetail', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      watch: '=xpackWatch', // Property names differ due to https://git.io/vSWXV
      onWatchChange: '=',
      onInvalid: '=',
      onValid: '='
    },
    bindToController: true,
    controllerAs: 'watchEditDetail',
    controller: class WatchEditDetailController {
      constructor($scope) {
        $scope.$watchMulti([
          'watchEditDetail.watch.id',
          'watchEditDetail.watch.name',
          'watchEditDetail.watch.watch'
        ], () => {
          this.onWatchChange(this.watch);
        });

        $scope.$watch('watchEditDetail.form.$valid', () => {
          this.updateIsValid();
        });

        this.documentationLinks = documentationLinks;
      }

      updateIsValid = () => {
        const isValid = !(this.form.$invalid || !this.isJsonValid);

        if (isValid) {
          this.onValid();
        } else {
          this.onInvalid();
        }
      }

      onJsonValid = () => {
        this.isJsonValid = true;
        this.updateIsValid();
      }

      onJsonInvalid = () => {
        this.isJsonValid = false;
        this.updateIsValid();
      }

      onJsonChange = (json) => {
        this.watch.watch = json;
      }
    }
  };
});
