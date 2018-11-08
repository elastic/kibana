/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

export const navigateToDashboard = () => ({
  name: 'navigateToDashboard',
  help:
    "Use the browser's location functionality to get your current location. Usually quite slow, but fairly accurate",
  args: {
    id: {
      aliases: ['_'],
      types: ['string'],
      help: 'A markdown expression. You can pass this multiple times to achieve concatenation',
      default: '2',
    },
    filterName: {
      types: ['string'],
      help: 'A markdown expression. You can pass this multiple times to achieve concatenation',
    },
  },
  fn: (context, args) => {
    const id = args.id;
    const name = args.filterName;
    const value = context.value.filter.series.label;
    const basePath = chrome.getBasePath();
    const location =
      `http://localhost:5601${basePath}/app/kibana#/dashboard/${id}` +
      `?_g=(refreshInterval:(pause:!f,value:900000),time:(from:now-24h,mode:quick,to:now))&` +
      `_a=(query:(language:lucene,query:'${name}:${value}'))`;

    window.location.href = location;
    return context;
  },
});
