/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// This bit of hackiness is required because this isn't part of the main kibana bundle
import 'jquery';

import { debounce, includes } from 'lodash';
import { RendererStrings } from '../../../i18n';
import { RendererFactory, RendererSpec } from '../../../types';
// @ts-expect-error Not going to convert
import { size } from './plugins/size';
// @ts-expect-error Not going to convert
import { text } from './plugins/text';

const { plot: strings } = RendererStrings;

const render: RendererSpec<any>['render'] = async (domNode, config, handlers) => {
  // TODO: OH NOES
  if (!includes($.plot.plugins, size)) {
    $.plot.plugins.push(size);
  }
  if (!includes($.plot.plugins, text)) {
    $.plot.plugins.push(text);
  }

  let plot: jquery.flot.plot;
  function draw() {
    if (domNode.clientHeight < 1 || domNode.clientWidth < 1) {
      return;
    }

    if (config.font) {
      const legendFormatter = (label: string) => {
        const labelSpan = document.createElement('span');
        Object.assign(labelSpan.style, config.font.spec);
        labelSpan.textContent = label;
        return labelSpan.outerHTML;
      };
      config.options.legend.labelFormatter = legendFormatter;
    }

    try {
      if (!plot) {
        plot = $.plot($(domNode), config.data, config.options);
      } else {
        plot.resize();
        plot.setupGrid();
        plot.draw();
      }
    } catch (e) {
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
};

export const plot: RendererFactory<any> = () => ({
  name: 'plot',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: false,
  render,
});
