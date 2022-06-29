/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PersistableStateDefinition } from '@kbn/kibana-utils-plugin/common';

export interface PersistableStateAttachmentType extends PersistableStateDefinition {
  id: string;
}

export interface AttachmentFramework {
  registerPersistableState: (
    persistableStateAttachmentType: PersistableStateAttachmentType
  ) => void;
}
