/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { SavedObjectsManagementColumn } from '../../../../../src/plugins/saved_objects_management/public';
import type { SpacesApiUi } from '../../../../../src/plugins/spaces_oss/public';

export class ShareToSpaceSavedObjectsManagementColumn
  implements SavedObjectsManagementColumn<void> {
  public id: string = 'share_saved_objects_to_space';

  public euiColumn = {
    field: 'namespaces',
    name: i18n.translate('xpack.spaces.management.shareToSpace.columnTitle', {
      defaultMessage: 'Shared spaces',
    }),
    description: i18n.translate('xpack.spaces.management.shareToSpace.columnDescription', {
      defaultMessage: 'The other spaces that this object is currently shared to',
    }),
    render: (namespaces: string[] | undefined) => {
      if (!namespaces) {
        return null;
      }
      return <this.spacesApiUi.components.SpaceList namespaces={namespaces} />;
    },
  };

  constructor(private readonly spacesApiUi: SpacesApiUi) {}
}
