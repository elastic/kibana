/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import type { SavedObjectsManagementRecord } from 'src/plugins/saved_objects_management/public';
import type { ShareToSpaceFlyoutProps, SpacesApiUi } from 'src/plugins/spaces_oss/public';

import { SavedObjectsManagementAction } from '../../../../../src/plugins/saved_objects_management/public';

interface WrapperProps {
  spacesApiUi: SpacesApiUi;
  props: ShareToSpaceFlyoutProps;
}

const Wrapper = ({ spacesApiUi, props }: WrapperProps) => {
  const LazyComponent = useMemo(() => spacesApiUi.components.getShareToSpaceFlyout, [spacesApiUi]);

  return <LazyComponent {...props} />;
};

export class ShareToSpaceSavedObjectsManagementAction extends SavedObjectsManagementAction {
  public id: string = 'share_saved_objects_to_space';

  public euiAction = {
    name: i18n.translate('xpack.spaces.shareToSpace.actionTitle', {
      defaultMessage: 'Share to space',
    }),
    description: i18n.translate('xpack.spaces.shareToSpace.actionDescription', {
      defaultMessage: 'Share this saved object to one or more spaces',
    }),
    icon: 'share',
    type: 'icon',
    available: (object: SavedObjectsManagementRecord) => {
      const hasCapability =
        !this.actionContext ||
        !!this.actionContext.capabilities.savedObjectsManagement.shareIntoSpace;
      const { namespaceType, hiddenType } = object.meta;
      return namespaceType === 'multiple' && !hiddenType && hasCapability;
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

    const props: ShareToSpaceFlyoutProps = {
      savedObjectTarget: {
        type: this.record.type,
        id: this.record.id,
        namespaces: this.record.namespaces ?? [],
        title: this.record.meta.title,
        icon: this.record.meta.icon,
      },
      flyoutIcon: 'share',
      onUpdate: () => (this.isDataChanged = true),
      onClose: this.onClose,
      enableCreateCopyCallout: true,
      enableCreateNewSpaceLink: true,
    };

    return <Wrapper spacesApiUi={this.spacesApiUi} props={props} />;
  };

  private onClose = () => {
    this.finish();
  };
}
