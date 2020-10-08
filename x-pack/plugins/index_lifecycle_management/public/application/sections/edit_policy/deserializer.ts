/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { produce } from 'immer';

import { SerializedPolicy } from '../../../../common/types';

import { splitSizeAndUnits } from '../../services/policies/policy_serialization';

import { FormInternal } from './components/phases/types';

export const deserializer = (phase: SerializedPolicy): FormInternal =>
  produce(phase, (draft: SerializedPolicy) => {
    const _meta: FormInternal['_meta'] = {
      hot: {
        useRollover: Boolean(draft.phases.hot?.actions?.rollover),
        forceMergeEnabled: Boolean(draft.phases.hot?.actions?.forcemerge),
        bestCompression: draft.phases.hot?.actions?.forcemerge?.index_codec === 'best_compression',
      },
    };

    if (draft.phases.hot?.actions?.rollover) {
      if (draft.phases.hot.actions.rollover.max_size) {
        const maxSize = splitSizeAndUnits(draft.phases.hot.actions.rollover.max_size);
        draft.phases.hot.actions.rollover.max_size = maxSize.size;
        _meta.hot.maxStorageSizeUnit = maxSize.units;
      }

      if (draft.phases.hot.actions.rollover.max_age) {
        const maxAge = splitSizeAndUnits(draft.phases.hot.actions.rollover.max_age);
        draft.phases.hot.actions.rollover.max_age = maxAge.size;
        _meta.hot.maxAgeUnit = maxAge.units;
      }
    }

    return {
      _meta,
      ...draft,
    };
  });
