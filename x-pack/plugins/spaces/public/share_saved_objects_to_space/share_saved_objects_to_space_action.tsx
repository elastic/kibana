/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  SavedObjectsManagementAction,
  SavedObjectsManagementRecord,
} from '../../../../../src/plugins/saved_objects_management/public';
import type { SpacesApiUi } from '../../../../../src/plugins/spaces_oss/public';

export class ShareToSpaceSavedObjectsManagementAction extends SavedObjectsManagementAction {
  public id: string = 'share_saved_objects_to_space';

  public euiAction = {
    name: i18n.translate('xpack.spaces.management.shareToSpace.actionTitle', {
      defaultMessage: 'Share to space',
    }),
    description: i18n.translate('xpack.spaces.management.shareToSpace.actionDescription', {
      defaultMessage: 'Share this saved object to one or more spaces',
    }),
    icon: 'share',
    type: 'icon',
    available: (object: SavedObjectsManagementRecord) => {
      const hasCapability =
        !this.actionContext ||
        !!this.actionContext.capabilities.savedObjectsManagement.shareIntoSpace;
      return object.meta.namespaceType === 'multiple' && hasCapability;
    },
    onClick: (object: SavedObjectsManagementRecord) => {
      this.isDataChanged = false;
      this.start(object);
    },
  };
  public refreshOnFinish = () => this.isDataChanged;

  private isDataChanged: boolean = false;

  constructor(private readonly spacesApiUi: SpacesApiUi) {
    super();
  }

  public render = () => {
    if (!this.record) {
      throw new Error('No record available! `render()` was likely called before `start()`.');
    }

    const savedObjectTarget = {
      type: this.record.type,
      id: this.record.id,
      namespaces: this.record.namespaces ?? [],
      title: this.record.meta.title,
      icon: this.record.meta.icon,
    };
    const { ShareToSpaceFlyout } = this.spacesApiUi.components;

    return (
      <ShareToSpaceFlyout
        savedObjectTarget={savedObjectTarget}
        onUpdate={() => (this.isDataChanged = true)}
        onClose={this.onClose}
        enableCreateCopyCallout={true}
        enableCreateNewSpaceLink={true}
      />
    );
  };

  private onClose = () => {
    this.finish();
  };
}
