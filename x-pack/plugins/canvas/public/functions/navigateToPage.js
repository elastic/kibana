/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const noop = () => {};

export const navigateToPage = () => ({
  name: 'navigateToPage',
  help:
    "Use the browser's location functionality to get your current location. Usually quite slow, but fairly accurate",
  args: {
    pageNumber: {
      aliases: ['_'],
      types: ['string'],
      help: 'A markdown expression. You can pass this multiple times to achieve concatenation',
      default: '2',
    },
  },
  fn: (context, args) => {
    window.location.href = window.location.href.replace(/\/[^\/]*$/, '/' + args.pageNum);
  },
});
