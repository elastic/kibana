/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// This bit of hackiness is required because this isn't part of the main kibana bundle
import 'jquery';
import '../../lib/flot-charts';

import { debounce, includes } from 'lodash';
import { RendererStrings } from '../../../i18n';
import { pie as piePlugin } from './plugins/pie';

const { pie: strings } = RendererStrings;

export const pie = () => ({
  name: 'pie',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: false,
  render(domNode, config, handlers) {
    if (!includes($.plot.plugins, piePlugin)) {
      $.plot.plugins.push(piePlugin);
    }

    config.options.legend.labelBoxBorderColor = 'transparent';

    if (config.font) {
      const labelFormatter = (label, slice) => {
        // font color defaults to slice color if not specified
        const fontSpec = { ...config.font.spec, color: config.font.spec.color || slice.color };
        const labelDiv = document.createElement('div');
        Object.assign(labelDiv.style, fontSpec);
        const labelSpan = new DOMParser().parseFromString(label, 'text/html').body.firstChild;
        const lineBreak = document.createElement('br');
        const percentText = document.createTextNode(`${Math.round(slice.percent)}%`);

        labelDiv.appendChild(labelSpan);
        labelDiv.appendChild(lineBreak);
        labelDiv.appendChild(percentText);
        return labelDiv.outerHTML;
      };
      config.options.series.pie.label.formatter = labelFormatter;

      const legendFormatter = (label) => {
        const labelSpan = document.createElement('span');
        Object.assign(labelSpan.style, config.font.spec);
        labelSpan.textContent = label;
        return labelSpan.outerHTML;
      };
      config.options.legend.labelFormatter = legendFormatter;
    }

    let plot;
    function draw() {
      if (domNode.clientHeight < 1 || domNode.clientWidth < 1) {
        return;
      }

      try {
        $(domNode).empty();
        if (!config.data || !config.data.length) {
          $(domNode).empty();
        } else {
          plot = $.plot($(domNode), config.data, config.options);
        }
      } catch (e) {
        console.log(e);
        // Nope
      }
    }

    function destroy() {
      if (plot) {
        plot.shutdown();
      }
    }

    handlers.onDestroy(destroy);
    handlers.onResize(debounce(draw, 40, { maxWait: 40 })); // 1000 / 40 = 25fps

    draw();

    return handlers.done();
  },
});
