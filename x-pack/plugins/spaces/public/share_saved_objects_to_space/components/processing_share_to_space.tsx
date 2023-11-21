/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiText } from '@elastic/eui';
import React from 'react';

import type { SavedObjectsUpdateObjectsSpacesResponse } from '@kbn/core-saved-objects-api-server';
import { FormattedMessage } from '@kbn/i18n-react';

import { ShareResult } from './share_result';
import type { SpacesDataEntry } from '../../types';
import type { ShareOptions } from '../types';

interface Props {
  shareResult?: SavedObjectsUpdateObjectsSpacesResponse;
  spaces: SpacesDataEntry[];
  shareOptions: ShareOptions;
}

export const ProcessingShareToSpace = (props: Props) => {
  const {
    shareOptions: { initiallySelectedSpaceIds, selectedSpaceIds },
    shareResult,
    spaces,
  } = props;

  const objects = shareResult?.objects || [];

  const removeFromSpaceIds = props.shareOptions.initiallySelectedSpaceIds.filter(
    (id) => !selectedSpaceIds.includes(id)
  );
  const addToSpaceIds = selectedSpaceIds.filter((id) => !initiallySelectedSpaceIds.includes(id));

  return (
    <div data-test-subj="share-to-space-processing">
      {addToSpaceIds.length ? (
        <>
          <EuiHorizontalRule margin="m" />
          <EuiText size="s">
            <h5>
              <FormattedMessage
                id="xpack.spaces.management.shareToSpace.shareResultsLabel"
                defaultMessage="Results (Shared)"
              />
            </h5>
          </EuiText>
          {addToSpaceIds.map((id) => {
            const space = spaces.find((s) => s.id === id)!;
            const addedObjects = objects.filter(({ spaces: namespaces }: { spaces: string[] }) =>
              namespaces.includes(id)
            );

            return (
              <ShareResult
                space={space}
                objects={addedObjects}
                isLoading={!objects.length}
                iconProps={{ type: 'checkInCircleFilled', color: 'success' }}
              />
            );
          })}
        </>
      ) : null}
      {removeFromSpaceIds.length ? (
        <>
          <EuiHorizontalRule margin="m" />
          <EuiText size="s">
            <h5>
              <FormattedMessage
                id="xpack.spaces.management.shareToSpace.unshareResultsLabel"
                defaultMessage="Results (Unshared)"
              />
            </h5>
          </EuiText>
          {removeFromSpaceIds.map((id) => {
            const space = spaces.find((s) => s.id === id)!;
            const removedObjects = objects.filter(
              ({ spaces: namespaces }: { spaces: string[] }) => !namespaces.includes(id)
            );

            return (
              <ShareResult
                space={space}
                objects={removedObjects}
                isLoading={!objects.length}
                iconProps={{ type: 'checkInCircleFilled', color: 'primary' }}
              />
            );
          })}
        </>
      ) : null}
    </div>
  );
};
