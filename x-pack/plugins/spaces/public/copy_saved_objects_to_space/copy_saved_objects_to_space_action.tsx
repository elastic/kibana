/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import type { SavedObjectsManagementRecord } from 'src/plugins/saved_objects_management/public';

import { SavedObjectsManagementAction } from '../../../../../src/plugins/saved_objects_management/public';
import type { CopyToSpaceFlyoutProps } from './components';
import { getCopyToSpaceFlyoutComponent } from './components';

const Wrapper = (props: CopyToSpaceFlyoutProps) => {
  const LazyComponent = useMemo(
    () => lazy(() => getCopyToSpaceFlyoutComponent().then((component) => ({ default: component }))),
    []
  );

  return (
    <React.Suspense fallback={<EuiLoadingSpinner />}>
      <LazyComponent {...props} />
    </React.Suspense>
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
      return object.meta.namespaceType !== 'agnostic';
    },
    onClick: (object: SavedObjectsManagementRecord) => {
      this.start(object);
    },
  };

  constructor() {
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

    return <Wrapper onClose={this.onClose} savedObjectTarget={savedObjectTarget} />;
  };

  private onClose = () => {
    this.finish();
  };
}
