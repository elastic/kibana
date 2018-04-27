/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import template from './event_output.html';
import './event_output.less';
import 'ace';

const app = uiModules.get('xpack/grokdebugger');

app.directive('eventOutput', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      structuredEvent: '='
    },
    bindToController: true,
    controllerAs: 'eventOutput',
    controller: class EventOutputController {
      constructor($scope) {
        $scope.aceLoaded = (editor) => {
          this.editor = editor;
          editor.getSession().setUseWrapMode(true);
          editor.setOptions({
            readOnly: true,
            highlightActiveLine: false,
            highlightGutterLine: false,
            minLines: 20,
            maxLines: 25
          });
          editor.$blockScrolling = Infinity;
        };
      }
    }
  };
});
