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
  useRollover: boolean;
  hasConfiguredRollover: boolean;
  maxStorageSizeUnit?: string;
  maxAgeUnit?: string;
}

interface WarmPhaseMetaFields extends DataAllocationMetaFields, MinAgeField, ForcemergeFields {
  enabled: boolean;
  warmPhaseOnRollover: boolean;
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
