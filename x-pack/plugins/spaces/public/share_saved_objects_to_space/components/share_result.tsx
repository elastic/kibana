/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { lazy, Suspense } from 'react';

import type { SavedObjectsUpdateObjectsSpacesResponseObject } from '@kbn/core-saved-objects-api-server';

import { getSpaceAvatarComponent } from '../../space_avatar';
import type { SpacesDataEntry } from '../../types';

// No need to wrap LazySpaceAvatar in an error boundary, because it is one of the first chunks loaded when opening Kibana.
const LazySpaceAvatar = lazy(() =>
  getSpaceAvatarComponent().then((component) => ({ default: component }))
);

interface Props {
  space: SpacesDataEntry;
  objects: SavedObjectsUpdateObjectsSpacesResponseObject[];
  isLoading: boolean;
  iconProps: {
    type: string;
    color: string;
  };
}

export const ShareResult = ({ space, objects, isLoading, iconProps }: Props) => {
  return (
    <>
      <EuiSpacer size="m" />

      <EuiAccordion
        id={`shareToSpace-${space.id}`}
        data-test-subj={`sts-space-result-${space.id}`}
        className="spcShareToSpaceResult"
        buttonContent={
          <EuiFlexGroup responsive={false}>
            <EuiFlexItem grow={false}>
              <Suspense fallback={<EuiLoadingSpinner />}>
                <LazySpaceAvatar space={space} size="s" />
              </Suspense>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>{space.name}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        extraAction={
          !isLoading ? (
            <EuiFlexGroup gutterSize="xs">
              <EuiFlexItem>
                <EuiIcon type={iconProps.type} color={iconProps.color} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiBadge>{objects.length}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <EuiLoadingSpinner />
          )
        }
      >
        {objects.map((object: SavedObjectsUpdateObjectsSpacesResponseObject) => (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>{object.type}</EuiFlexItem>
              <EuiFlexItem grow={5}>{object.id}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIcon type={iconProps.type} color={iconProps.color} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        ))}
      </EuiAccordion>
    </>
  );
};
