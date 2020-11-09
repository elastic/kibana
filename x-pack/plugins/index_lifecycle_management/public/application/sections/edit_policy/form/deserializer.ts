/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { produce } from 'immer';

import { SerializedPolicy } from '../../../../../common/types';

import { splitSizeAndUnits } from '../../../lib/policies';

import { determineDataTierAllocationType } from '../../../lib';

import { FormInternal } from '../types';

export const deserializer = (policy: SerializedPolicy): FormInternal => {
  const {
    phases: { hot, warm, cold, delete: deletePhase },
  } = policy;

  const _meta: FormInternal['_meta'] = {
    hot: {
      useRollover: Boolean(hot?.actions?.rollover),
      forceMergeEnabled: Boolean(hot?.actions?.forcemerge),
      bestCompression: hot?.actions?.forcemerge?.index_codec === 'best_compression',
    },
    warm: {
      enabled: Boolean(warm),
      warmPhaseOnRollover: Boolean(warm?.min_age === '0ms'),
      forceMergeEnabled: Boolean(warm?.actions?.forcemerge),
      bestCompression: warm?.actions?.forcemerge?.index_codec === 'best_compression',
      dataTierAllocationType: determineDataTierAllocationType(warm?.actions),
    },
    cold: {
      enabled: Boolean(cold),
      dataTierAllocationType: determineDataTierAllocationType(cold?.actions),
      freezeEnabled: Boolean(cold?.actions?.freeze),
    },
    delete: {
      enabled: Boolean(deletePhase),
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

      if (draft.phases.cold) {
        if (draft.phases.cold.actions?.allocate?.require) {
          Object.entries(draft.phases.cold.actions.allocate.require).forEach((entry) => {
            draft._meta.cold.allocationNodeAttribute = entry.join(':');
          });
        }

        if (draft.phases.cold.min_age) {
          const minAge = splitSizeAndUnits(draft.phases.cold.min_age);
          draft.phases.cold.min_age = minAge.size;
          draft._meta.cold.minAgeUnit = minAge.units;
        }
      }

      if (draft.phases.delete) {
        if (draft.phases.delete.min_age) {
          const minAge = splitSizeAndUnits(draft.phases.delete.min_age);
          draft.phases.delete.min_age = minAge.size;
          draft._meta.delete.minAgeUnit = minAge.units;
        }
      }
    }
  );
};
