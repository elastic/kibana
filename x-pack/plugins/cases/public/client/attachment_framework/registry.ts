/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

interface BaseAttachmentType {
  id: string;
}

export class AttachmentTypeRegistry<T extends BaseAttachmentType> {
  private readonly attachmentTypes: Map<string, T> = new Map();

  /**
   * Returns true if the attachment type registry has the given type registered
   */
  public has(id: string) {
    return this.attachmentTypes.has(id);
  }

  /**
   * Registers an attachment type to the type registry
   */
  public register(attachmentType: T) {
    if (this.has(attachmentType.id)) {
      throw new Error(
        i18n.translate('xpack.cases.typeRegistry.register.duplicateAttachmentTypeErrorMessage', {
          defaultMessage: 'Attachment type "{id}" is already registered.',
          values: {
            id: attachmentType.id,
          },
        })
      );
    }

    this.attachmentTypes.set(attachmentType.id, attachmentType);
  }

  /**
   * Returns an attachment type, throw error if not registered
   */
  public get(id: string): T {
    const attachmentType = this.attachmentTypes.get(id);

    if (!attachmentType) {
      throw new Error(
        i18n.translate('xpack.cases.typeRegistry.get.missingActionTypeErrorMessage', {
          defaultMessage: 'Attachment type "{id}" is not registered.',
          values: {
            id,
          },
        })
      );
    }

    return attachmentType;
  }

  public list() {
    return Array.from(this.attachmentTypes).map(([id, attachmentType]) => attachmentType);
  }
}
