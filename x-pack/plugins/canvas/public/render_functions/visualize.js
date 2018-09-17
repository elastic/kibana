/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getVisualizeLoader } from 'ui/visualize/loader';

export const visualize = () => ({
  name: 'visualize',
  displayName: 'Kibana Visualizations',
  help: 'Render Kibana visualizations using their saved object ID',
  render: async (domNode, config, handlers) => {
    domNode.style.display = 'flex'; // required for kibana visualizations to render correctly

    if (config.id) {
      try {
        const loader = await getVisualizeLoader();
        await loader.embedVisualizationWithId(domNode, config.id, config.time);
      } catch (err) {
        domNode.textContent = 'Failed to render saved visualization :(';
      }
    } else {
      domNode.textContent = 'Choose a saved visualization to render';
    }

    handlers.done();
  },
});
