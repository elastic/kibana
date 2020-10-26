/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SerializedPolicy } from '../../../../common/types';

/**
 * Describes the shape of data after deserialization.
 */
export interface FormInternal extends SerializedPolicy {
  /**
   * This is a special internal-only field that is used to display or hide
   * certain form fields which affects what is ultimately serialized.
   */
  _meta: {
    hot: {
      useRollover: boolean;
      forceMergeEnabled: boolean;
      bestCompression: boolean;
      maxStorageSizeUnit?: string;
      maxAgeUnit?: string;
    };
  };
}
