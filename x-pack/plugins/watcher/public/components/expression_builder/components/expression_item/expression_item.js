/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'ui/fancy_forms';
import { uiModules } from 'ui/modules';
import { keyMap } from 'ui/utils/key_map';
import template from './expression_item.html';

const app = uiModules.get('xpack/watcher');

app.directive('expressionItem', function ($injector) {
  const $document = $injector.get('$document');
  const $timeout = $injector.get('$timeout');

  return {
    restrict: 'E',
    replace: true,
    require: '^expressionBuilder',
    transclude: true,
    template: template,
    scope: {
      itemId: '@',
      description: '=',
      value: '=',
      isOpen: '=',
      isVisible: '=',
      onOpen: '=',
      onClose: '=',
      isValid: '=',
      isDirty: '=',
      form: '='
    },
    bindToController: true,
    controllerAs: 'expressionItem',
    link: function ($scope, $el) {
      $scope.expressionItem.$firstInput = $el.find('[data-id="expressionItemPopoverContent"]').find(':input:first');
      const $button = $el.find('[data-id="expressionItemButton"]');

      const buttonFocusOrClick = () => {
        $scope.$apply(() => {
          $scope.expressionItem.onPopoverOpen();
        });
      };

      const documentClick = (event) => {
        if ($el.find(event.originalEvent.target).length === 0) {
          $scope.$apply(() => {
            $scope.expressionItem.onPopoverClose();
          });
        }
      };

      const documentKeydown = (event) => {
        if ($scope.expressionItem.isOpen && keyMap[event.keyCode] === 'escape') {
          $scope.$apply(() => {
            $scope.expressionItem.onPopoverClose();
          });
        }
      };

      $button.on('focus', buttonFocusOrClick);
      $button.on('click', buttonFocusOrClick);
      $document.on('click', documentClick);
      $document.on('keydown', documentKeydown);
      $scope.$on('$destroy', () => {
        $button.off('focus', buttonFocusOrClick);
        $button.off('click', buttonFocusOrClick);
        $document.off('click', documentClick);
        $document.off('keydown', documentKeydown);
      });
    },
    controller: class ExpressionItemController {
      constructor($scope) {
        $scope.$watch('expressionItem.isOpen', (isOpen, wasOpen) => {
          if (isOpen) {
            $timeout(() => {
              $scope.expressionItem.$firstInput.focus();
            });
          } else if (wasOpen) {
            this.form.$setTouched(true);
            this.form.$setDirty(true);
          }
        });
      }

      onPopoverClose = () => {
        this.onClose(this.itemId);
      }

      onPopoverOpen = () => {
        this.onOpen(this.itemId);
      }
    }
  };
});
