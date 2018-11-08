/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { getState, getStore } from '../state/store';
import { getResult } from '../state/selectors/workpad';
import { setResult } from '../state/actions/workpad';

export const saveReference = () => ({
  name: 'saveReference',
  args: {
    id: {
      types: ['string'],
      help: 'action',
      default: '',
    },
  },
  help: 'Collect element filters on the workpad, usually to provide them to a data source',
  fn: (context, args) => {
    console.log('saveReference: context ', context);
    const lastResult = getResult(getState(), args.id);
    if (!_.eq(lastResult, context)) {
      getStore().dispatch(setResult(context, args.id));
    }

    return context;
  },
});
