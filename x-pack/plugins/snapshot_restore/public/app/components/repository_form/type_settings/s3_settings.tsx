/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import { Repository, S3Repository } from '../../../../../common/types';
import { useAppDependencies } from '../../../index';

interface Props {
  repository: S3Repository;
  updateRepositorySettings: (
    updatedSettings: Partial<Repository['settings']>,
    replaceSettings?: boolean
  ) => void;
}

export const S3Settings: React.FunctionComponent<Props> = ({
  repository,
  updateRepositorySettings,
}) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();
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
  ].map(option => ({
    value: option,
    text: option,
  }));

  const storageClassOptions = ['standard', 'reduced_redundancy', 'standard_ia'].map(option => ({
    value: option,
    text: option,
  }));

  return (
    <Fragment>
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
            defaultMessage="The name of the bucket to be used for snapshots. Required."
          />
        }
        idAria="s3RepositoryBucketDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeS3.bucketLabel"
              defaultMessage="Bucket"
            />
          }
          fullWidth
          describedByIds={['s3RepositoryBucketDescription']}
        >
          <EuiFieldText
            defaultValue={bucket || ''}
            fullWidth
            onChange={e => {
              updateRepositorySettings({
                bucket: e.target.value,
              });
            }}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

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
            defaultMessage="The name of client to use to connect to S3."
          />
        }
        idAria="s3RepositoryClientDescription"
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
          describedByIds={['s3RepositoryClientDescription']}
        >
          <EuiFieldText
            defaultValue={client || ''}
            fullWidth
            onChange={e => {
              updateRepositorySettings({
                client: e.target.value,
              });
            }}
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
            defaultMessage="Specifies the path within bucket to repository data. Base path should omit the leading forward slash."
          />
        }
        idAria="s3RepositoryBasePathDescription"
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
          describedByIds={['s3RepositoryBasePathDescription']}
        >
          <EuiFieldText
            defaultValue={basePath || ''}
            fullWidth
            onChange={e => {
              updateRepositorySettings({
                basePath: e.target.value,
              });
            }}
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
                defaultMessage="Compress"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeS3.compressDescription"
            defaultMessage="Turns on compression of the snapshot files.
              Compression is applied only to metadata files (index mapping and settings).
              Data files are not compressed."
          />
        }
        idAria="s3RepositoryCompressDescription"
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace={true}
          fullWidth
          describedByIds={['s3RepositoryCompressDescription']}
        >
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeS3.compressLabel"
                defaultMessage="Enable compression"
              />
            }
            checked={!(compress === false)}
            onChange={e => {
              updateRepositorySettings({
                compress: e.target.checked,
              });
            }}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Chunk size field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeS3.chunkSizeTitle"
                defaultMessage="Chunk size"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeS3.chunkSizeDescription"
            defaultMessage="Big files can be broken down into chunks during snapshotting if needed.
              The chunk size can be specified in bytes or by using size value notation, i.e. 1g, 10m, 5k."
          />
        }
        idAria="s3RepositoryChunkSizeDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeS3.chunkSizeLabel"
              defaultMessage="Chunk size"
            />
          }
          fullWidth
          describedByIds={['s3RepositoryChunkSizeDescription']}
        >
          <EuiFieldText
            defaultValue={chunkSize || ''}
            fullWidth
            onChange={e => {
              updateRepositorySettings({
                chunkSize: e.target.value,
              });
            }}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

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
            defaultMessage="Encrypt files on server side using AES256 algorithm."
          />
        }
        idAria="s3RepositoryServerSideEncryptionDescription"
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace={true}
          fullWidth
          describedByIds={['s3RepositoryServerSideEncryptionDescription']}
        >
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeS3.serverSideEncryptionLabel"
                defaultMessage="Enable server-side encryption"
              />
            }
            checked={!!serverSideEncryption}
            onChange={e => {
              updateRepositorySettings({
                serverSideEncryption: e.target.checked,
              });
            }}
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
            defaultMessage="Minimum threshold below which the chunk is uploaded using a single request.
              Beyond this threshold, the S3 repository will use the AWS Multipart Upload API to split
              the chunk into several parts, each of the specified buffer size length,
              and to upload each part in its own request."
          />
        }
        idAria="s3RepositoryBufferSizeDescription"
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
          describedByIds={['s3RepositoryBufferSizeDescription']}
        >
          <EuiFieldText
            defaultValue={bufferSize || ''}
            fullWidth
            onChange={e => {
              updateRepositorySettings({
                bufferSize: e.target.value,
              });
            }}
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
            defaultMessage="When the S3 repository creates buckets and objects, it adds the canned ACL into the buckets and objects."
          />
        }
        idAria="s3RepositoryCannedAclDescription"
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
          describedByIds={['s3RepositoryCannedAclDescription']}
        >
          <EuiSelect
            options={cannedAclOptions}
            value={cannedAcl || cannedAclOptions[0].value}
            onChange={e => {
              updateRepositorySettings({
                cannedAcl: e.target.value,
              });
            }}
            fullWidth
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
            defaultMessage="Sets the S3 storage class for objects stored in the snapshot repository.
              Changing this setting on an existing repository only affects the storage class for newly created objects,
              resulting in a mixed usage of storage classes."
          />
        }
        idAria="s3RepositoryStorageClassDescription"
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
          describedByIds={['s3RepositoryStorageClassDescription']}
        >
          <EuiSelect
            options={storageClassOptions}
            value={storageClass || storageClassOptions[0].value}
            onChange={e => {
              updateRepositorySettings({
                storageClass: e.target.value,
              });
            }}
            fullWidth
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </Fragment>
  );
};
