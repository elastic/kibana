/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { NotificationsStart, StartServicesAccessor } from 'src/core/public';
import {
  SavedObjectsManagementAction,
  SavedObjectsManagementRecord,
} from '../../../../../src/plugins/saved_objects_management/public';
import { ContextWrapper, ShareSavedObjectsToSpaceFlyout } from './components';
import { SpacesManager } from '../spaces_manager';
import { PluginsStart } from '../plugin';

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

  constructor(
    private readonly spacesManager: SpacesManager,
    private readonly notifications: NotificationsStart,
    private readonly getStartServices: StartServicesAccessor<PluginsStart>
  ) {
    super();
  }

  public render = () => {
    if (!this.record) {
      throw new Error('No record available! `render()` was likely called before `start()`.');
    }

    return (
      <ContextWrapper getStartServices={this.getStartServices}>
        <ShareSavedObjectsToSpaceFlyout
          onClose={this.onClose}
          onObjectUpdated={() => (this.isDataChanged = true)}
          savedObject={this.record}
          spacesManager={this.spacesManager}
          toastNotifications={this.notifications.toasts}
        />
      </ContextWrapper>
    );
  };

  private onClose = () => {
    this.finish();
  };
}
