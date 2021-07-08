/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { markdown } from '../markdown';

export const markdownFn: ReturnType<typeof markdown>['fn'] = async (input, args) => {
  // @ts-expect-error untyped local
  const { Handlebars } = await import('../../../../common/lib/handlebars');
  const compileFunctions = args.content.map((str) =>
    Handlebars.compile(String(str), { knownHelpersOnly: true })
  );
  const ctx = {
    columns: [],
    rows: [],
    type: null,
    ...input,
  };

  return {
    type: 'render',
    as: 'markdown',
    value: {
      content: compileFunctions.map((fn) => fn(ctx)).join(''),
      font: args.font,
      openLinksInNewTab: args.openLinksInNewTab,
    },
  };
};
