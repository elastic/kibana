/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getStore } from '../state/store';
import { setFilter } from '../state/actions/elements';

export const setFilters = () => ({
  name: 'setFilters',
  args: {
    filter: {
      types: ['filter'],
      help: 'action',
      default: '',
    },
  },
  help: 'Collect element filters on the workpad, usually to provide them to a data source',
  fn: (context, args, handlers) => {
    getStore().dispatch(setFilter(args.filter));
    return context;
  },
});
