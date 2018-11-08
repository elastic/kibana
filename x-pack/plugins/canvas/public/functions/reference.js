/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getState } from '../state/store';
import { getResult } from '../state/selectors/workpad';

export const reference = () => ({
  name: 'reference',
  args: {
    ids: {
      types: ['string'],
      help: 'action',
      default: '',
    },
  },
  help: 'Collect element filters on the workpad, usually to provide them to a data source',
  fn: (context, args) => {
    console.log('reference fn is being executed');
    const ids = args.ids.split(',');
    let result = {};
    ids.forEach(id => {
      // ORDER CAN MATTER! Later ids can overwrite earlier ones. how to handle this???
      result = {
        ...getResult(getState(), id),
        ...result,
      };
    });
    console.log('result is', result);
    return result;
  },
});
