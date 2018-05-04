/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { EDITOR } from '../../../../../common/constants';
import { applyEditorOptions } from '../../../../lib/ace/apply_editor_options';
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
          applyEditorOptions(editor, EDITOR.SAMPLE_DATA_MIN_LINES, EDITOR.SAMPLE_DATA_MAX_LINES);
        };
      }
    }
  };
});
