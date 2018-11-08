/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { factories } from 'ui/embeddable/embeddable_factories_registry';
import ReactDOM from 'react-dom';

export const embeddable = () => ({
  name: 'embeddable',
  displayName: 'Embeddable',
  help: 'Render an embeddable',
  reuseDomNode: true,
  height: 50,
  async render(domNode, config, handlers) {
    const embeddableFactory = factories.getFactoryByName(config.type);
    const embeddable = await embeddableFactory.create(config, () => {});
    embeddable.render(domNode, { timeRange: { from: 'now-30m', to: 'now' } });

    handlers.onDestroy(() => {
      ReactDOM.unmountComponentAtNode(domNode);
      embeddable.destroy();
    });
  },
});
