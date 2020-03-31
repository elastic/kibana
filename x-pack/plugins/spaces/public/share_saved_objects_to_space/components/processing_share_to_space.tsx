/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiSpacer,
  EuiText,
  EuiListGroup,
  EuiListGroupItem,
  EuiHorizontalRule,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ProcessedImportResponse } from '../../../../../../src/legacy/core_plugins/kibana/public';
import { SavedObjectsManagementRecord } from '../../../../../../src/plugins/saved_objects_management/public';
import { Space } from '../../../common/model/space';
import { ShareOptions, ImportRetry } from '../types';
import { SpaceResult } from './space_result';
import { summarizeShareResult } from '..';

interface Props {
  savedObject: SavedObjectsManagementRecord;
  shareInProgress: boolean;
  conflictResolutionInProgress: boolean;
  shareResult: Record<string, ProcessedImportResponse>;
  retries: Record<string, ImportRetry[]>;
  onRetriesChange: (retries: Record<string, ImportRetry[]>) => void;
  spaces: Space[];
  shareOptions: ShareOptions;
}

export const ProcessingShareToSpace = (props: Props) => {
  function updateRetries(spaceId: string, updatedRetries: ImportRetry[]) {
    props.onRetriesChange({
      ...props.retries,
      [spaceId]: updatedRetries,
    });
  }

  return (
    <div data-test-subj="share-to-space-processing">
      <EuiListGroup className="spcShareToSpaceOptionsView" flush>
        <EuiListGroupItem
          iconType={props.shareOptions.includeRelated ? 'check' : 'cross'}
          label={
            props.shareOptions.includeRelated ? (
              <FormattedMessage
                id="xpack.spaces.management.shareToSpace.includeRelatedLabel"
                defaultMessage="Including related saved objects"
              />
            ) : (
              <FormattedMessage
                id="xpack.spaces.management.shareToSpace.dontIncludeRelatedLabel"
                defaultMessage="Not including related saved objects"
              />
            )
          }
        />
        <EuiListGroupItem
          iconType={props.shareOptions.overwrite ? 'check' : 'cross'}
          label={
            props.shareOptions.overwrite ? (
              <FormattedMessage
                id="xpack.spaces.management.shareToSpace.overwriteLabel"
                defaultMessage="Automatically overwriting saved objects"
              />
            ) : (
              <FormattedMessage
                id="xpack.spaces.management.shareToSpace.dontOverwriteLabel"
                defaultMessage="Not overwriting saved objects"
              />
            )
          }
        />
      </EuiListGroup>
      <EuiHorizontalRule margin="m" />
      <EuiText size="s">
        <h5>
          <FormattedMessage
            id="xpack.spaces.management.shareToSpace.shareResultsLabel"
            defaultMessage="Share results"
          />
        </h5>
      </EuiText>
      <EuiSpacer size="m" />
      {props.shareOptions.selectedSpaceIds.map(id => {
        const space = props.spaces.find(s => s.id === id) as Space;
        const spaceShareResult = props.shareResult[space.id];
        const summarizedSpaceShareResult = summarizeShareResult(
          props.savedObject,
          spaceShareResult,
          props.shareOptions.includeRelated
        );

        return (
          <Fragment key={id}>
            <SpaceResult
              savedObject={props.savedObject}
              space={space}
              summarizedShareResult={summarizedSpaceShareResult}
              retries={props.retries[space.id] || []}
              onRetriesChange={retries => updateRetries(space.id, retries)}
              conflictResolutionInProgress={props.conflictResolutionInProgress}
            />
            <EuiSpacer size="s" />
          </Fragment>
        );
      })}
    </div>
  );
};
