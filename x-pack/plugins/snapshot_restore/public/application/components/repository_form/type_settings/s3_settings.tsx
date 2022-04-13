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
  EuiSelect,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';

import { Repository, S3Repository } from '../../../../../common/types';
import { RepositorySettingsValidation } from '../../../services/validation';
import { ChunkSizeField, MaxSnapshotsField, MaxRestoreField } from './common';

interface Props {
  repository: S3Repository;
  updateRepositorySettings: (
    updatedSettings: Partial<Repository['settings']>,
    replaceSettings?: boolean
  ) => void;
  settingErrors: RepositorySettingsValidation;
}

export const S3Settings: React.FunctionComponent<Props> = ({
  repository,
  updateRepositorySettings,
  settingErrors,
}) => {
  const {
    settings: {
      bucket,
      client,
      basePath,
      compress,
      chunkSize,
      serverSideEncryption,
      bufferSize,
      cannedAcl,
      storageClass,
      maxRestoreBytesPerSec,
      maxSnapshotBytesPerSec,
      readonly,
    },
  } = repository;

  const cannedAclOptions = [
    'private',
    'public-read',
    'public-read-write',
    'authenticated-read',
    'log-delivery-write',
    'bucket-owner-read',
    'bucket-owner-full-control',
  ].map((option) => ({
    value: option,
    text: option,
  }));
  const hasErrors: boolean = Boolean(Object.keys(settingErrors).length);
  const updateSettings = (name: string, value: string) => {
    updateRepositorySettings({
      [name]: value,
    });
  };

  const storageClassOptions = ['standard', 'reduced_redundancy', 'standard_ia'].map((option) => ({
    value: option,
    text: option,
  }));

  return (
    <Fragment>
      {/* Client field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeS3.clientTitle"
                defaultMessage="Client"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeS3.clientDescription"
            defaultMessage="The name of the AWS S3 client."
          />
        }
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeS3.clientLabel"
              defaultMessage="Client"
            />
          }
          fullWidth
          isInvalid={Boolean(hasErrors && settingErrors.client)}
          error={settingErrors.client}
        >
          <EuiFieldText
            defaultValue={client || ''}
            fullWidth
            onChange={(e) => {
              updateRepositorySettings({
                client: e.target.value,
              });
            }}
            data-test-subj="clientInput"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Bucket field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeS3.bucketTitle"
                defaultMessage="Bucket"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeS3.bucketDescription"
            defaultMessage="The name of the AWS S3 bucket to use for snapshots."
          />
        }
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeS3.bucketLabel"
              defaultMessage="Bucket (required)"
            />
          }
          fullWidth
          isInvalid={Boolean(hasErrors && settingErrors.bucket)}
          error={settingErrors.bucket}
        >
          <EuiFieldText
            defaultValue={bucket || ''}
            fullWidth
            onChange={(e) => {
              updateRepositorySettings({
                bucket: e.target.value,
              });
            }}
            data-test-subj="bucketInput"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Base path field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeS3.basePathTitle"
                defaultMessage="Base path"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeS3.basePathDescription"
            defaultMessage="The bucket path to the repository data."
          />
        }
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeS3.basePathLabel"
              defaultMessage="Base path"
            />
          }
          fullWidth
          isInvalid={Boolean(hasErrors && settingErrors.basePath)}
          error={settingErrors.basePath}
        >
          <EuiFieldText
            defaultValue={basePath || ''}
            fullWidth
            onChange={(e) => {
              updateRepositorySettings({
                basePath: e.target.value,
              });
            }}
            data-test-subj="basePathInput"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Compress field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeS3.compressTitle"
                defaultMessage="Snapshot compression"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeS3.compressDescription"
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
                id="xpack.snapshotRestore.repositoryForm.typeS3.compressLabel"
                defaultMessage="Compress snapshots"
              />
            }
            checked={!(compress === false)}
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

      {/* Server side encryption field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeS3.serverSideEncryptionTitle"
                defaultMessage="Server-side encryption"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeS3.serverSideEncryptionDescription"
            defaultMessage="Encrypts files on the server using AES256 algorithm."
          />
        }
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace={true}
          fullWidth
          isInvalid={Boolean(hasErrors && settingErrors.serverSideEncryption)}
          error={settingErrors.serverSideEncryption}
        >
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeS3.serverSideEncryptionLabel"
                defaultMessage="Server-side encryption"
              />
            }
            checked={!!serverSideEncryption}
            onChange={(e) => {
              updateRepositorySettings({
                serverSideEncryption: e.target.checked,
              });
            }}
            data-test-subj="serverSideEncryptionToggle"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Buffer size field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeS3.bufferSizeTitle"
                defaultMessage="Buffer size"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeS3.bufferSizeDescription"
            defaultMessage="Beyond this minimum threshold, the S3 repository will use the AWS Multipart Upload API
              to split the chunk into several parts and upload each in its own request."
          />
        }
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeS3.bufferSizeLabel"
              defaultMessage="Buffer size"
            />
          }
          fullWidth
          isInvalid={Boolean(hasErrors && settingErrors.bufferSize)}
          error={settingErrors.bufferSize}
          helpText={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeS3.bufferSizeHelpText"
              defaultMessage="Accepts byte size units, such as {example1}, {example2}, {example3}, or {example4}. Defaults to {defaultSize} or {defaultPercentage} of JVM heap, whichever is smaller."
              values={{
                example1: <EuiCode>1g</EuiCode>,
                example2: <EuiCode>10mb</EuiCode>,
                example3: <EuiCode>5k</EuiCode>,
                example4: <EuiCode>1024B</EuiCode>,
                defaultSize: <EuiCode>100mb</EuiCode>,
                defaultPercentage: <EuiCode>5%</EuiCode>,
              }}
            />
          }
        >
          <EuiFieldText
            defaultValue={bufferSize || ''}
            fullWidth
            onChange={(e) => {
              updateRepositorySettings({
                bufferSize: e.target.value,
              });
            }}
            data-test-subj="bufferSizeInput"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Canned ACL field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeS3.cannedAclTitle"
                defaultMessage="Canned ACL"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeS3.cannedAclDescription"
            defaultMessage="The canned ACL to add to new S3 buckets and objects."
          />
        }
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeS3.cannedAclLabel"
              defaultMessage="Canned ACL"
            />
          }
          fullWidth
          isInvalid={Boolean(hasErrors && settingErrors.cannedAcl)}
          error={settingErrors.cannedAcl}
        >
          <EuiSelect
            options={cannedAclOptions}
            value={cannedAcl || cannedAclOptions[0].value}
            onChange={(e) => {
              updateRepositorySettings({
                cannedAcl: e.target.value,
              });
            }}
            fullWidth
            data-test-subj="cannedAclSelect"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Storage class field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeS3.storageClassTitle"
                defaultMessage="Storage class"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeS3.storageClassDescription"
            defaultMessage="The storage class for new objects in the S3 repository."
          />
        }
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeS3.storageClassLabel"
              defaultMessage="Storage class"
            />
          }
          fullWidth
          isInvalid={Boolean(hasErrors && settingErrors.storageClass)}
          error={settingErrors.storageClass}
        >
          <EuiSelect
            options={storageClassOptions}
            value={storageClass || storageClassOptions[0].value}
            onChange={(e) => {
              updateRepositorySettings({
                storageClass: e.target.value,
              });
            }}
            fullWidth
            data-test-subj="storageClassSelect"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

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
                id="xpack.snapshotRestore.repositoryForm.typeS3.readonlyTitle"
                defaultMessage="Read-only"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeS3.readonlyDescription"
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
                id="xpack.snapshotRestore.repositoryForm.typeS3.readonlyLabel"
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
