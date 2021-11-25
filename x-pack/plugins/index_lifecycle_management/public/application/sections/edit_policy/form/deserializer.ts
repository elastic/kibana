/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { produce } from 'immer';

import { SerializedPolicy } from '../../../../../common/types';
import { splitSizeAndUnits } from '../../../lib/policies';
import { determineDataTierAllocationType, isUsingDefaultRollover } from '../../../lib';
import { getDefaultRepository } from '../lib';
import { FormInternal } from '../types';
import { CLOUD_DEFAULT_REPO } from '../constants';

export const createDeserializer =
  (isCloudEnabled: boolean) =>
  (policy: SerializedPolicy): FormInternal => {
    const {
      phases: { hot, warm, cold, frozen, delete: deletePhase },
    } = policy;

    let defaultRepository = getDefaultRepository([
      hot?.actions.searchable_snapshot,
      cold?.actions.searchable_snapshot,
      frozen?.actions.searchable_snapshot,
    ]);

    if (!defaultRepository && isCloudEnabled) {
      defaultRepository = CLOUD_DEFAULT_REPO;
    }

    const _meta: FormInternal['_meta'] = {
      hot: {
        isUsingDefaultRollover: isUsingDefaultRollover(policy),
        customRollover: {
          enabled: Boolean(hot?.actions?.rollover),
        },
        bestCompression: hot?.actions?.forcemerge?.index_codec === 'best_compression',
        readonlyEnabled: Boolean(hot?.actions?.readonly),
        shrink: { isUsingShardSize: Boolean(hot?.actions.shrink?.max_primary_shard_size) },
      },
      warm: {
        enabled: Boolean(warm),
        warmPhaseOnRollover: warm === undefined ? true : Boolean(warm.min_age === '0ms'),
        bestCompression: warm?.actions?.forcemerge?.index_codec === 'best_compression',
        dataTierAllocationType: determineDataTierAllocationType(warm?.actions),
        readonlyEnabled: Boolean(warm?.actions?.readonly),
        minAgeToMilliSeconds: -1,
        shrink: { isUsingShardSize: Boolean(warm?.actions.shrink?.max_primary_shard_size) },
      },
      cold: {
        enabled: Boolean(cold),
        dataTierAllocationType: determineDataTierAllocationType(cold?.actions),
        readonlyEnabled: Boolean(cold?.actions?.readonly),
        minAgeToMilliSeconds: -1,
      },
      frozen: {
        enabled: Boolean(frozen),
        dataTierAllocationType: determineDataTierAllocationType(frozen?.actions),
        minAgeToMilliSeconds: -1,
      },
      delete: {
        enabled: Boolean(deletePhase),
        minAgeToMilliSeconds: -1,
      },
      searchableSnapshot: {
        repository: defaultRepository,
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
            draft._meta.hot.customRollover.maxStorageSizeUnit = maxSize.units;
          }

          if (draft.phases.hot.actions.rollover.max_primary_shard_size) {
            const maxPrimaryShardSize = splitSizeAndUnits(
              draft.phases.hot.actions.rollover.max_primary_shard_size
            );
            draft.phases.hot.actions.rollover.max_primary_shard_size = maxPrimaryShardSize.size;
            draft._meta.hot.customRollover.maxPrimaryShardSizeUnit = maxPrimaryShardSize.units;
          }

          if (draft.phases.hot.actions.rollover.max_age) {
            const maxAge = splitSizeAndUnits(draft.phases.hot.actions.rollover.max_age);
            draft.phases.hot.actions.rollover.max_age = maxAge.size;
            draft._meta.hot.customRollover.maxAgeUnit = maxAge.units;
          }
        }
        if (draft.phases.hot?.actions.shrink?.max_primary_shard_size) {
          const primaryShardSize = splitSizeAndUnits(
            draft.phases.hot.actions.shrink.max_primary_shard_size!
          );
          draft.phases.hot.actions.shrink.max_primary_shard_size = primaryShardSize.size;
          draft._meta.hot.shrink.maxPrimaryShardSizeUnits = primaryShardSize.units;
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

          if (draft.phases.warm.actions.shrink?.max_primary_shard_size) {
            const primaryShardSize = splitSizeAndUnits(
              draft.phases.warm.actions.shrink.max_primary_shard_size!
            );
            draft.phases.warm.actions.shrink.max_primary_shard_size = primaryShardSize.size;
            draft._meta.warm.shrink.maxPrimaryShardSizeUnits = primaryShardSize.units;
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

        if (draft.phases.frozen) {
          if (draft.phases.frozen.min_age) {
            const minAge = splitSizeAndUnits(draft.phases.frozen.min_age);
            draft.phases.frozen.min_age = minAge.size;
            draft._meta.frozen.minAgeUnit = minAge.units;
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
