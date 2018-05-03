/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { InitAfterBindingsWorkaround } from 'ui/compat';
import { EDITOR } from '../../../../../common/constants';
import template from './custom_patterns_input.html';
import './custom_patterns_input.less';
import 'ui/toggle_panel';
import 'ace';

const app = uiModules.get('xpack/grokdebugger');

app.directive('customPatternsInput', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      onChange: '='
    },
    bindToController: true,
    controllerAs: 'customPatternsInput',
    controller: class CustomPatternsInputController extends InitAfterBindingsWorkaround {
      initAfterBindings($scope) {
        this.isCollapsed = {
          action: true
        };
        $scope.$watch('customPatternsInput.customPatterns', () => {
          this.onChange(this.customPatterns);
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
            maxLines: 10,
          });
          editor.$blockScrolling = Infinity;
        };
      }

      onSectionToggle = (sectionId) => {
        this.isCollapsed[sectionId] = !this.isCollapsed[sectionId];
      }

      isSectionCollapsed = (sectionId) => {
        return this.isCollapsed[sectionId];
      }
    }
  };
});
