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
import {
  ProcessedImportResponse,
  SavedObjectsManagementRecord,
} from 'src/plugins/saved_objects_management/public';
import { Space } from '../../../common/model/space';
import { CopyOptions, ImportRetry } from '../types';
import { SpaceResult, SpaceResultProcessing } from './space_result';
import { summarizeCopyResult } from '..';

interface Props {
  savedObject: SavedObjectsManagementRecord;
  copyInProgress: boolean;
  conflictResolutionInProgress: boolean;
  copyResult: Record<string, ProcessedImportResponse>;
  retries: Record<string, ImportRetry[]>;
  onRetriesChange: (retries: Record<string, ImportRetry[]>) => void;
  spaces: Space[];
  copyOptions: CopyOptions;
}

const renderCopyOptions = ({ createNewCopies, overwrite, includeRelated }: CopyOptions) => {
  const createNewCopiesLabel = createNewCopies ? (
    <FormattedMessage
      id="xpack.spaces.management.copyToSpace.createNewCopiesLabel"
      defaultMessage="Create new objects with random IDs"
    />
  ) : (
    <FormattedMessage
      id="xpack.spaces.management.copyToSpace.dontCreateNewCopiesLabel"
      defaultMessage="Check for existing objects"
    />
  );
  const overwriteLabel = overwrite ? (
    <FormattedMessage
      id="xpack.spaces.management.copyToSpace.overwriteLabel"
      defaultMessage="Automatically try to overwrite conflicts"
    />
  ) : (
    <FormattedMessage
      id="xpack.spaces.management.copyToSpace.dontOverwriteLabel"
      defaultMessage="Do not automatically try to overwrite conflicts"
    />
  );
  const includeRelatedLabel = includeRelated ? (
    <FormattedMessage
      id="xpack.spaces.management.copyToSpace.includeRelatedLabel"
      defaultMessage="Include related saved objects"
    />
  ) : (
    <FormattedMessage
      id="xpack.spaces.management.copyToSpace.dontIncludeRelatedLabel"
      defaultMessage="Do not include related saved objects"
    />
  );

  return (
    <EuiListGroup className="spcCopyToSpaceOptionsView" flush>
      <EuiListGroupItem iconType="copy" label={createNewCopiesLabel} />
      {!createNewCopies && (
        <EuiListGroupItem iconType={overwrite ? 'check' : 'cross'} label={overwriteLabel} />
      )}
      <EuiListGroupItem iconType={includeRelated ? 'check' : 'cross'} label={includeRelatedLabel} />
    </EuiListGroup>
  );
};

export const ProcessingCopyToSpace = (props: Props) => {
  function updateRetries(spaceId: string, updatedRetries: ImportRetry[]) {
    props.onRetriesChange({
      ...props.retries,
      [spaceId]: updatedRetries,
    });
  }

  return (
    <div data-test-subj="copy-to-space-processing">
      {renderCopyOptions(props.copyOptions)}
      <EuiHorizontalRule margin="m" />
      <EuiText size="s">
        <h5>
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.copyResultsLabel"
            defaultMessage="Results"
          />
        </h5>
      </EuiText>
      <EuiSpacer size="m" />
      {props.copyOptions.selectedSpaceIds.map((id) => {
        const space = props.spaces.find((s) => s.id === id) as Space;
        const spaceCopyResult = props.copyResult[space.id];
        const summarizedSpaceCopyResult = summarizeCopyResult(props.savedObject, spaceCopyResult);

        return (
          <Fragment key={id}>
            {summarizedSpaceCopyResult.processing ? (
              <SpaceResultProcessing space={space} />
            ) : (
              <SpaceResult
                savedObject={props.savedObject}
                space={space}
                summarizedCopyResult={summarizedSpaceCopyResult}
                retries={props.retries[space.id] || []}
                onRetriesChange={(retries) => updateRetries(space.id, retries)}
                conflictResolutionInProgress={props.conflictResolutionInProgress}
              />
            )}
            <EuiSpacer size="s" />
          </Fragment>
        );
      })}
    </div>
  );
};
