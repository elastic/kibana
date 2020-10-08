/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { NotificationsStart } from 'src/core/public';
import {
  SavedObjectsManagementAction,
  SavedObjectsManagementRecord,
} from '../../../../../src/plugins/saved_objects_management/public';
import { CopySavedObjectsToSpaceFlyout } from './components';
import { SpacesManager } from '../spaces_manager';

export class CopyToSpaceSavedObjectsManagementAction extends SavedObjectsManagementAction {
  public id: string = 'copy_saved_objects_to_space';

  public euiAction = {
    name: i18n.translate('xpack.spaces.management.copyToSpace.actionTitle', {
      defaultMessage: 'Copy to space',
    }),
    description: i18n.translate('xpack.spaces.management.copyToSpace.actionDescription', {
      defaultMessage: 'Make a copy of this saved object in one or more spaces',
    }),
    icon: 'copy',
    type: 'icon',
    available: (object: SavedObjectsManagementRecord) => {
      return object.meta.namespaceType !== 'agnostic';
    },
    onClick: (object: SavedObjectsManagementRecord) => {
      this.start(object);
    },
  };

  constructor(
    private readonly spacesManager: SpacesManager,
    private readonly notifications: NotificationsStart
  ) {
    super();
  }

  public render = () => {
    if (!this.record) {
      throw new Error('No record available! `render()` was likely called before `start()`.');
    }
    return (
      <CopySavedObjectsToSpaceFlyout
        onClose={this.onClose}
        savedObject={this.record}
        spacesManager={this.spacesManager}
        toastNotifications={this.notifications.toasts}
      />
    );
  };

  private onClose = () => {
    this.finish();
  };
}
