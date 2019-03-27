/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { FSRepository, Repository } from '../../../../../common/types';
import { useAppDependencies } from '../../../index';

import {
  EuiCode,
  // @ts-ignore
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';

interface Props {
  repository: FSRepository;
  onSettingsChange: (repository: Repository['settings']) => void;
}

export const FSSettings: React.FunctionComponent<Props> = ({ repository, onSettingsChange }) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();
  const {
    settings: {
      location,
      compress,
      chunk_size,
      max_restore_bytes_per_sec,
      max_snapshot_bytes_per_sec,
      readonly,
    },
  } = repository;

  return (
    <Fragment>
      {/* Location field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeFS.locationTitle"
                defaultMessage="Location"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <Fragment>
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeFS.locationDescription"
              defaultMessage="File system location. Required."
            />
            <EuiSpacer size="m" />
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeReadonly.urlFilePathDescription"
              defaultMessage="This location (or one of its parent directories) must be registered in the {settingKey} setting on all master and data nodes."
              values={{
                settingKey: <EuiCode>path.repo</EuiCode>,
              }}
            />
          </Fragment>
        }
        idAria="fsRepositoryLocationDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeFS.locationLabel"
              defaultMessage="Location"
            />
          }
          fullWidth
          describedByIds={['fsRepositoryLocationDescription']}
        >
          <EuiFieldText
            defaultValue={location || ''}
            fullWidth
            onChange={e => {
              onSettingsChange({
                ...repository.settings,
                location: e.target.value,
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
                id="xpack.snapshotRestore.repositoryForm.typeFS.compressTitle"
                defaultMessage="Compress"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeFS.compressDescription"
            defaultMessage="Turns on compression of the snapshot files.
              Compression is applied only to metadata files (index mapping and settings).
              Data files are not compressed."
          />
        }
        idAria="fsRepositoryCompressDescription"
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace={true}
          fullWidth
          describedByIds={['fsRepositoryCompressDescription']}
        >
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeFS.compressLabel"
                defaultMessage="Enable compression"
              />
            }
            checked={!!compress}
            onChange={e => {
              onSettingsChange({
                ...repository.settings,
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
                id="xpack.snapshotRestore.repositoryForm.typeFS.chunkSizeTitle"
                defaultMessage="Chunk size"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeFS.chunkSizeDescription"
            defaultMessage="Big files can be broken down into chunks during snapshotting if needed.
              The chunk size can be specified in bytes or by using size value notation, i.e. 1g, 10m, 5k."
          />
        }
        idAria="fsRepositoryChunkSizeDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeFS.chunkSizeLabel"
              defaultMessage="Chunk size"
            />
          }
          fullWidth
          describedByIds={['fsRepositoryChunkSizeDescription']}
        >
          <EuiFieldText
            defaultValue={chunk_size || ''}
            fullWidth
            onChange={e => {
              onSettingsChange({
                ...repository.settings,
                chunk_size: e.target.value,
              });
            }}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Max restore bytes field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeFS.maxRestoreBytesTitle"
                defaultMessage="Max restore bytes per second"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeFS.maxRestoreBytesDescription"
            defaultMessage="Throttles per node restore rate."
          />
        }
        idAria="fsRepositoryMaxRestoreBytesDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeFS.maxRestoreBytesLabel"
              defaultMessage="Max restore bytes per second"
            />
          }
          fullWidth
          describedByIds={['fsRepositoryMaxRestoreBytesDescription']}
        >
          <EuiFieldText
            defaultValue={max_restore_bytes_per_sec || ''}
            fullWidth
            onChange={e => {
              onSettingsChange({
                ...repository.settings,
                max_restore_bytes_per_sec: e.target.value,
              });
            }}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Max snapshot bytes field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeFS.maxSnapshotBytesTitle"
                defaultMessage="Max snapshot bytes per second"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeFS.maxSnapshotBytesDescription"
            defaultMessage="Throttles per node snapshot rate."
          />
        }
        idAria="fsRepositoryMaxSnapshotBytesDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeFS.maxSnapshotBytesLabel"
              defaultMessage="Max snapshot bytes per second"
            />
          }
          fullWidth
          describedByIds={['fsRepositoryMaxSnapshotBytesDescription']}
        >
          <EuiFieldText
            defaultValue={max_snapshot_bytes_per_sec || ''}
            fullWidth
            onChange={e => {
              onSettingsChange({
                ...repository.settings,
                max_snapshot_bytes_per_sec: e.target.value,
              });
            }}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Readonly field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeFS.readonlyTitle"
                defaultMessage="Readonly"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeFS.readonlyDescription"
            defaultMessage="Makes repository read-only."
          />
        }
        idAria="fsRepositoryReadonlyDescription"
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace={true}
          fullWidth
          describedByIds={['fsRepositoryReadonlyDescription']}
        >
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeFS.readonlyLabel"
                defaultMessage="Enable readonly"
              />
            }
            checked={!!readonly}
            onChange={e => {
              onSettingsChange({
                ...repository.settings,
                readonly: e.target.checked,
              });
            }}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </Fragment>
  );
};
