/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiHorizontalRule,
  EuiListGroup,
  EuiListGroupItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { Fragment } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import type { SpacesDataEntry } from '../../types';
import type { ProcessedImportResponse } from '../lib';
import { summarizeCopyResult } from '../lib';
import type { CopyOptions, CopyToSpaceSavedObjectTarget, ImportRetry } from '../types';
import { SpaceResult, SpaceResultProcessing } from './space_result';

interface Props {
  savedObjectTarget: Required<CopyToSpaceSavedObjectTarget>;
  copyInProgress: boolean;
  conflictResolutionInProgress: boolean;
  copyResult: Record<string, ProcessedImportResponse>;
  retries: Record<string, ImportRetry[]>;
  onRetriesChange: (retries: Record<string, ImportRetry[]>) => void;
  spaces: SpacesDataEntry[];
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

  return (
    <EuiListGroup className="spcCopyToSpaceOptionsView" flush>
      <EuiListGroupItem iconType="copy" label={createNewCopiesLabel} />
      {!createNewCopies && (
        <EuiListGroupItem
          iconType={overwrite ? 'check' : 'cross'}
          label={
            <FormattedMessage
              id="xpack.spaces.management.copyToSpace.overwriteLabel"
              defaultMessage="Automatically overwrite conflicts"
            />
          }
        />
      )}
      <EuiListGroupItem
        iconType={includeRelated ? 'check' : 'cross'}
        label={
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.includeRelatedLabel"
            defaultMessage="Include related saved objects"
          />
        }
      />
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
        const space = props.spaces.find((s) => s.id === id)!;
        const spaceCopyResult = props.copyResult[space.id];
        const summarizedSpaceCopyResult = summarizeCopyResult(
          props.savedObjectTarget,
          spaceCopyResult
        );

        return (
          <Fragment key={id}>
            {summarizedSpaceCopyResult.processing ? (
              <SpaceResultProcessing space={space} />
            ) : (
              <SpaceResult
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
