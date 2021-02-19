/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';

import { i18n } from '@kbn/i18n';
import type { SavedObjectsManagementColumn } from 'src/plugins/saved_objects_management/public';
import type { SpacesApiUi, SpaceListProps } from 'src/plugins/spaces_oss/public';

type WrapperProps = SpaceListProps & {
  spacesApiUi: SpacesApiUi;
};

const Wrapper = ({ spacesApiUi, ...props }: WrapperProps) => {
  const LazyComponent = React.lazy(spacesApiUi.components.getSpaceList);

  return (
    <React.Suspense fallback={<EuiLoadingSpinner />}>
      <LazyComponent {...props} />
    </React.Suspense>
  );
};

export class ShareToSpaceSavedObjectsManagementColumn
  implements SavedObjectsManagementColumn<void> {
  public id: string = 'share_saved_objects_to_space';

  public euiColumn = {
    field: 'namespaces',
    name: i18n.translate('xpack.spaces.shareToSpace.columnTitle', {
      defaultMessage: 'Shared spaces',
    }),
    description: i18n.translate('xpack.spaces.shareToSpace.columnDescription', {
      defaultMessage: 'The other spaces that this object is currently shared to',
    }),
    render: (namespaces: string[] | undefined) => {
      if (!namespaces) {
        return null;
      }

      const props: SpaceListProps = {
        namespaces,
      };

      return <Wrapper spacesApiUi={this.spacesApiUi} {...props} />;
    },
  };

  constructor(private readonly spacesApiUi: SpacesApiUi) {}
}
