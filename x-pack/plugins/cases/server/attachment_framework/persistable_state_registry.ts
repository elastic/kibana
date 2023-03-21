/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identity } from 'lodash';
import { AttachmentTypeRegistry } from '../../common/registry';
import type { PersistableStateAttachmentType, PersistableStateAttachmentTypeSetup } from './types';

export class PersistableStateAttachmentTypeRegistry extends AttachmentTypeRegistry<PersistableStateAttachmentType> {
  constructor() {
    super('PersistableStateAttachmentTypeRegistry');
  }

  public register(attachmentType: PersistableStateAttachmentTypeSetup): void {
    const item: PersistableStateAttachmentType = {
      id: attachmentType.id,
      telemetry: attachmentType.telemetry || ((state, stats) => stats),
      inject: attachmentType.inject || identity,
      extract: attachmentType.extract || ((state) => ({ state, references: [] })),
      migrations: attachmentType.migrations || {},
    };

    super.register(item);
  }
}
