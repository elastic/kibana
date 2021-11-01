/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SerializedPolicy } from '../../../../common/types';

export type DataTierAllocationType = 'node_roles' | 'node_attrs' | 'none';

export interface DataAllocationMetaFields {
  dataTierAllocationType: DataTierAllocationType;
  allocationNodeAttribute?: string;
}

export interface MinAgeField {
  minAgeUnit?: string;
  minAgeToMilliSeconds: number;
}

export interface ForcemergeFields {
  bestCompression: boolean;
}

interface ShrinkFields {
  shrink: {
    isUsingShardSize: boolean;
    maxPrimaryShardSizeUnits?: string;
  };
}

interface HotPhaseMetaFields extends ForcemergeFields, ShrinkFields {
  /**
   * By default rollover is enabled with set values for max age, max size and max docs. In this policy form
   * opting in to default rollover overrides custom rollover values.
   */
  isUsingDefaultRollover: boolean;

  readonlyEnabled: boolean;

  /**
   * If a policy has defined values other than the default rollover {@link defaultRolloverAction}, we store
   * them here.
   */
  customRollover: {
    enabled: boolean;
    maxPrimaryShardSizeUnit?: string;
    maxAgeUnit?: string;

    /**
     * @deprecated This is the byte size unit for the max_size field which will by removed in version 8+ of the stack.
     */
    maxStorageSizeUnit?: string;
  };
}

interface WarmPhaseMetaFields
  extends DataAllocationMetaFields,
    MinAgeField,
    ForcemergeFields,
    ShrinkFields {
  enabled: boolean;
  warmPhaseOnRollover: boolean;
  readonlyEnabled: boolean;
}

interface ColdPhaseMetaFields extends DataAllocationMetaFields, MinAgeField {
  enabled: boolean;
  readonlyEnabled: boolean;
}

interface FrozenPhaseMetaFields extends DataAllocationMetaFields, MinAgeField {
  enabled: boolean;
}

interface DeletePhaseMetaFields extends MinAgeField {
  enabled: boolean;
}

/**
 * Describes the shape of data after deserialization.
 */
export interface FormInternal extends SerializedPolicy {
  /**
   * This is a special internal-only field that is used to display or hide
   * certain form fields which affects what is ultimately serialized.
   */
  _meta: {
    hot: HotPhaseMetaFields;
    warm: WarmPhaseMetaFields;
    cold: ColdPhaseMetaFields;
    frozen: FrozenPhaseMetaFields;
    delete: DeletePhaseMetaFields;
    searchableSnapshot: {
      repository: string;
    };
  };
}
