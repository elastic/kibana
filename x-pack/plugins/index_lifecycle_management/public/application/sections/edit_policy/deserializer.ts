/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { produce } from 'immer';

import { SerializedPolicy } from '../../../../common/types';

import { splitSizeAndUnits } from '../../services/policies/policy_serialization';

import { determineDataTierAllocationType } from '../../lib';

import { FormInternal } from './types';

export const deserializer = (policy: SerializedPolicy): FormInternal => {
  const _meta: FormInternal['_meta'] = {
    hot: {
      useRollover: Boolean(policy.phases.hot?.actions?.rollover),
      forceMergeEnabled: Boolean(policy.phases.hot?.actions?.forcemerge),
      bestCompression: policy.phases.hot?.actions?.forcemerge?.index_codec === 'best_compression',
    },
    warm: {
      enabled: Boolean(policy.phases.warm),
      warmPhaseOnRollover: Boolean(policy.phases.warm?.min_age === '0ms'),
      forceMergeEnabled: Boolean(policy.phases.warm?.actions?.forcemerge),
      bestCompression: policy.phases.warm?.actions?.forcemerge?.index_codec === 'best_compression',
      dataTierAllocationType: determineDataTierAllocationType(policy.phases.warm?.actions),
    },
  };

  return produce<FormInternal>(
    {
      ...policy,
      _meta,
    },
    (draft: FormInternal) => {
      if (draft.phases.hot?.actions?.rollover) {
        if (draft.phases.hot.actions.rollover.max_size) {
          const maxSize = splitSizeAndUnits(draft.phases.hot.actions.rollover.max_size);
          draft.phases.hot.actions.rollover.max_size = maxSize.size;
          draft._meta.hot.maxStorageSizeUnit = maxSize.units;
        }

        if (draft.phases.hot.actions.rollover.max_age) {
          const maxAge = splitSizeAndUnits(draft.phases.hot.actions.rollover.max_age);
          draft.phases.hot.actions.rollover.max_age = maxAge.size;
          draft._meta.hot.maxAgeUnit = maxAge.units;
        }
      }

      if (draft.phases.warm) {
        if (draft.phases.warm.actions?.allocate?.require) {
          Object.entries(draft.phases.warm.actions.allocate.require).forEach((entry) => {
            draft._meta.warm.allocationNodeAttribute = entry.join(':');
          });
        }

        if (draft.phases.warm.min_age) {
          const minAge = splitSizeAndUnits(draft.phases.warm.min_age);
          draft.phases.warm.min_age = minAge.size;
          draft._meta.warm.minAgeUnit = minAge.units;
        }
      }
    }
  );
};
