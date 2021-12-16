/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiCode,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFormRow,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import { FSRepository, Repository } from '../../../../../common/types';
import { RepositorySettingsValidation } from '../../../services/validation';
import { ChunkSizeField, MaxRestoreField, MaxSnapshotsField } from './common';

interface Props {
  repository: FSRepository;
  updateRepositorySettings: (
    updatedSettings: Partial<Repository['settings']>,
    replaceSettings?: boolean
  ) => void;
  settingErrors: RepositorySettingsValidation;
}

export const FSSettings: React.FunctionComponent<Props> = ({
  repository,
  updateRepositorySettings,
  settingErrors,
}) => {
  const {
    settings: {
      location,
      compress,
      chunkSize,
      maxRestoreBytesPerSec,
      maxSnapshotBytesPerSec,
      readonly,
    },
  } = repository;
  const hasErrors: boolean = Boolean(Object.keys(settingErrors).length);
  const updateSettings = (name: string, value: string) => {
    updateRepositorySettings({
      [name]: value,
    });
  };

  return (
    <Fragment>
      {/* Location field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeFS.locationTitle"
                defaultMessage="File system location"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <Fragment>
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryFor.typeFS.locationDescription"
              defaultMessage="The location must be registered in the {settingKey} setting on all master and data nodes."
              values={{
                settingKey: <EuiCode>path.repo</EuiCode>,
              }}
            />
          </Fragment>
        }
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeFS.locationLabel"
              defaultMessage="Location (required)"
            />
          }
          fullWidth
          isInvalid={Boolean(hasErrors && settingErrors.location)}
          error={settingErrors.location}
        >
          <EuiFieldText
            defaultValue={location || ''}
            fullWidth
            onChange={(e) => {
              updateRepositorySettings({
                location: e.target.value,
              });
            }}
            data-test-subj="locationInput"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Compress field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeFS.compressTitle"
                defaultMessage="Snapshot compression"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeFS.compressDescription"
            defaultMessage="Compresses the index mapping and setting files for snapshots. Data files are not compressed."
          />
        }
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace={true}
          fullWidth
          isInvalid={Boolean(hasErrors && settingErrors.compress)}
          error={settingErrors.compress}
        >
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeFS.compressLabel"
                defaultMessage="Compress snapshots"
              />
            }
            checked={!!compress}
            onChange={(e) => {
              updateRepositorySettings({
                compress: e.target.checked,
              });
            }}
            data-test-subj="compressToggle"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Chunk size field */}
      <ChunkSizeField
        isInvalid={Boolean(hasErrors && settingErrors.chunkSize)}
        error={settingErrors.chunkSize}
        defaultValue={chunkSize || ''}
        updateSettings={updateSettings}
      />

      {/* Max snapshot bytes field */}
      <MaxSnapshotsField
        isInvalid={Boolean(hasErrors && settingErrors.maxSnapshotBytesPerSec)}
        error={settingErrors.maxSnapshotBytesPerSec}
        defaultValue={maxSnapshotBytesPerSec || ''}
        updateSettings={updateSettings}
      />

      {/* Max restore bytes field */}
      <MaxRestoreField
        isInvalid={Boolean(hasErrors && settingErrors.maxRestoreBytesPerSec)}
        error={settingErrors.maxRestoreBytesPerSec}
        defaultValue={maxRestoreBytesPerSec || ''}
        updateSettings={updateSettings}
      />

      {/* Readonly field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeFS.readonlyTitle"
                defaultMessage="Read-only"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeFS.readonlyDescription"
            defaultMessage="Only one cluster should have write access to this repository. All other clusters should be read-only."
          />
        }
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace={true}
          fullWidth
          isInvalid={Boolean(hasErrors && settingErrors.readonly)}
          error={settingErrors.readonly}
        >
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeFS.readonlyLabel"
                defaultMessage="Read-only repository"
              />
            }
            checked={!!readonly}
            onChange={(e) => {
              updateRepositorySettings({
                readonly: e.target.checked,
              });
            }}
            data-test-subj="readOnlyToggle"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </Fragment>
  );
};
