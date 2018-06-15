/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { EDITOR } from '../../../../../common/constants';
import template from './pattern_input.html';
import './pattern_input.less';
import {
  applyEditorOptions,
  GrokMode
} from '../../../../lib/ace';

const app = uiModules.get('xpack/grokdebugger');

app.directive('patternInput', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      onChange: '='
    },
    bindToController: true,
    controllerAs: 'patternInput',
    controller: class PatternInputController {
      constructor($scope) {
        $scope.$watch('patternInput.pattern', (newPattern) => {
          this.onChange(newPattern);
        });
        $scope.aceLoaded = (editor) => {
          this.editor = editor;
          applyEditorOptions(editor, EDITOR.PATTERN_MIN_LINES, EDITOR.PATTERN_MAX_LINES);
          editor.getSession().setMode(new GrokMode());
        };
      }
    }
  };
});
