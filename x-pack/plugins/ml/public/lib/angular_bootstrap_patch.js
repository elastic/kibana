/* eslint-disable @kbn/eslint/require-license-header */

/**
 * @notice
 *
 * This product includes code that was extracted from angular-ui-bootstrap@0.13.1
 * which is available under an "MIT" license
 *
 * The MIT License
 *
 * Copyright (c) 2012-2016 the AngularUI Team, http://angular-ui.github.io/bootstrap/
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

// This file contains a section of code taken from angular-ui-bootstrap@0.13.1
// and adds it to kibana's included version of 0.12.1
// It adds the ability to allow html to be used as the content of the popover component

import 'ui/angular-bootstrap';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module
  .directive('popover', [ '$tooltip', function ($tooltip) {
    return $tooltip('popover', 'popover', 'click');
  }])
  .directive('popoverHtmlUnsafePopup', function ($compile) {
    let template = '<div class="popover {{placement}}" ng-class="{ in: isOpen(), fade: animation() }">';
    template += '<div class="arrow"></div>';
    template += '<div class="popover-inner">';
    template += '<h3 class="popover-title" bind-html-unsafe="title" ng-show="title"></h3>';
    template += '<div class="popover-content" bind-html-unsafe="content" ></div>';
    template += '</div></div>';
    return {
      restrict: 'EA',
      replace: true,
      scope: {
        title: '@',
        content: '@',
        placement: '@',
        animation: '&',
        isOpen: '&'
      },
      template: template,
      link: function (scope, element) {
        // The content of the popup is added as a string and does not run through angular's templating system.
        // therefore {{stuff}} substitutions don't happen.
        // we have to manually apply the template, compile it with this scope and then set it as the html
        scope.$apply();
        const cont = $compile(scope.content)(scope);
        element.find('.popover-content').html(cont);

        // function to force the popover to close
        scope.closePopover = function () {
          scope.$parent.$parent.isOpen = false;
          scope.$parent.$parent.$applyAsync();
          element.remove();
        };
      }
    };
  })
  .directive('popoverHtmlUnsafe', ['$tooltip', function ($tooltip) {
    return $tooltip('popoverHtmlUnsafe', 'popover', 'click');
  }]);
