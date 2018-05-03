/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { EDITOR } from '../../../../../common/constants';
import template from './event_input.html';
import './event_input.less';
import 'ace';

const app = uiModules.get('xpack/grokdebugger');

app.directive('eventInput', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      onChange: '='
    },
    bindToController: true,
    controllerAs: 'eventInput',
    controller: class EventInputController {
      constructor($scope) {
        $scope.$watch('eventInput.rawEvent', (newRawEvent) => {
          this.onChange(newRawEvent);
        });
        $scope.aceLoaded = (editor) => {
          this.editor = editor;
          editor.getSession().setUseWrapMode(true);

          /*
           * This sets the space between the editor's borders and the
           * edges of the top/bottom lines to make for a less-crowded
           * typing experience.
          */
          editor.renderer.setScrollMargin(
            EDITOR.SCROLL_MARGIN_TOP,
            EDITOR.SCROLL_MARGIN_BOTTOM,
            0,
            0
          );

          editor.setOptions({
            highlightActiveLine: false,
            highlightGutterLine: false,
            minLines: 3,
            maxLines: 50
          });
          editor.$blockScrolling = Infinity;
        };
      }
    }
  };
});
