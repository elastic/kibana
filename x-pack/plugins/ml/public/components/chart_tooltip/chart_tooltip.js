/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import $ from 'jquery';
import template from './chart_tooltip.html';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlChartTooltip', function (mlChartTooltipService) {
  return {
    restrict: 'E',
    replace: true,
    template,
    link: function (scope, element) {
      mlChartTooltipService.element = element;
    }
  };
})
  .service('mlChartTooltipService', function ($timeout) {
    this.element = null;
    this.fadeTimeout = null;
    const doc = document.documentElement;
    const FADE_TIMEOUT_MS = 200;

    this.show = function (contents, target, offset = { x: 0, y: 0 }) {
      if (this.element !== null) {

      // if a previous fade out was happening, stop it
        if (this.fadeTimeout !== null) {
          $timeout.cancel(this.fadeTimeout);
        }

        // populate the tooltip contents
        this.element.html(contents);

        // side bar width
        const navOffset = $('.global-nav').width();
        const contentWidth = $('body').width() - navOffset - 10;
        const tooltipWidth = this.element.width();
        const scrollTop = (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0);

        const pos = target.getBoundingClientRect();
        const x = (pos.left + (offset.x) + 4) - navOffset;
        const y = pos.top + (offset.y) + scrollTop;

        if (x + tooltipWidth > contentWidth) {
        // the tooltip is hanging off the side of the page,
        // so move it to the other side of the target
          this.element.css({
            'left': x - (tooltipWidth + offset.x + 22),
            'top': (y - 28)
          });
        } else {
          this.element.css({
            'left': x,
            'top': (y - 28)
          });
        }

        this.element.css({
          'opacity': '0.9',
          'display': 'block'
        });
      }

      this.hide = function () {
        if (this.element !== null) {
          this.element.css({
            'opacity': '0',
          });

          // after the fade out transition has finished, set the display to
          // none so it doesn't block any mouse events underneath it.
          this.fadeTimeout = $timeout(() => {
            this.element.css('display', 'none');
            this.fadeTimeout = null;
          }, FADE_TIMEOUT_MS);
        }
      };
    };
  });
