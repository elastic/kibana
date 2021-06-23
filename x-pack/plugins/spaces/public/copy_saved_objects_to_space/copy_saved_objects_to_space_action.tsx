/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import useAsync from 'react-use/lib/useAsync';

import { i18n } from '@kbn/i18n';
import type { StartServicesAccessor } from 'src/core/public';
import type { SavedObjectsManagementRecord } from 'src/plugins/saved_objects_management/public';

import { SavedObjectsManagementAction } from '../../../../../src/plugins/saved_objects_management/public';
import type { PluginsStart } from '../plugin';
import { SuspenseErrorBoundary } from '../suspense_error_boundary';
import type { CopyToSpaceFlyoutProps } from './components';
import { getCopyToSpaceFlyoutComponent } from './components';

const LazyCopyToSpaceFlyout = lazy(() =>
  getCopyToSpaceFlyoutComponent().then((component) => ({ default: component }))
);

interface WrapperProps {
  getStartServices: StartServicesAccessor<PluginsStart>;
  props: CopyToSpaceFlyoutProps;
}

const Wrapper = ({ getStartServices, props }: WrapperProps) => {
  const { value: startServices = [{ notifications: undefined }] } = useAsync(getStartServices);
  const [{ notifications }] = startServices;

  if (!notifications) {
    return null;
  }

  return (
    <SuspenseErrorBoundary notifications={notifications}>
      <LazyCopyToSpaceFlyout {...props} />
    </SuspenseErrorBoundary>
  );
};

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
      return object.meta.namespaceType !== 'agnostic' && !object.meta.hiddenType;
    },
    onClick: (object: SavedObjectsManagementRecord) => {
      this.start(object);
    },
  };

  constructor(private getStartServices: StartServicesAccessor<PluginsStart>) {
    super();
  }

  public render = () => {
    if (!this.record) {
      throw new Error('No record available! `render()` was likely called before `start()`.');
    }

    const props: CopyToSpaceFlyoutProps = {
      onClose: this.onClose,
      savedObjectTarget: {
        type: this.record.type,
        id: this.record.id,
        namespaces: this.record.namespaces ?? [],
        title: this.record.meta.title,
        icon: this.record.meta.icon,
      },
    };

    return <Wrapper getStartServices={this.getStartServices} props={props} />;
  };

  private onClose = () => {
    this.finish();
  };
}
