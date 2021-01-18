/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SerializedPolicy } from '../../../../common/types';

export type DataTierAllocationType = 'node_roles' | 'node_attrs' | 'none';

export interface DataAllocationMetaFields {
  dataTierAllocationType: DataTierAllocationType;
  allocationNodeAttribute?: string;
}

export interface MinAgeField {
  minAgeUnit?: string;
}

export interface ForcemergeFields {
  bestCompression: boolean;
}

interface HotPhaseMetaFields extends ForcemergeFields {
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
    maxStorageSizeUnit?: string;
    maxAgeUnit?: string;
  };
}

interface WarmPhaseMetaFields extends DataAllocationMetaFields, MinAgeField, ForcemergeFields {
  enabled: boolean;
  warmPhaseOnRollover: boolean;
  readonlyEnabled: boolean;
}

interface ColdPhaseMetaFields extends DataAllocationMetaFields, MinAgeField {
  enabled: boolean;
  freezeEnabled: boolean;
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
    delete: DeletePhaseMetaFields;
  };
}
