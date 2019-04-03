/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { AzureRepository, Repository } from '../../../../../common/types';
import { useAppDependencies } from '../../../index';

import {
  EuiCode,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';

interface Props {
  repository: AzureRepository;
  updateRepositorySettings: (
    updatedSettings: Partial<Repository['settings']>,
    replaceSettings?: boolean
  ) => void;
}

export const AzureSettings: React.FunctionComponent<Props> = ({
  repository,
  updateRepositorySettings,
}) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();
  const {
    settings: { client, container, base_path, compress, chunk_size, readonly, location_mode },
  } = repository;

  const locationModeOptions = ['primary_only', 'secondary_only'].map(option => ({
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
                id="xpack.snapshotRestore.repositoryForm.typeAzure.clientTitle"
                defaultMessage="Client"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeAzure.clientDescription"
            defaultMessage="Azure named client to use."
          />
        }
        idAria="azureRepositoryClientDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeAzure.clientLabel"
              defaultMessage="Client"
            />
          }
          fullWidth
          describedByIds={['azureRepositoryClientDescription']}
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

      {/* Container field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeAzure.containerTitle"
                defaultMessage="Container"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeAzure.containerDescription"
            defaultMessage="Container name. You must create the azure container before creating the repository."
          />
        }
        idAria="azureRepositoryContainerDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeAzure.containerLabel"
              defaultMessage="Container"
            />
          }
          fullWidth
          describedByIds={['azureRepositoryContainerDescription']}
        >
          <EuiFieldText
            defaultValue={container || ''}
            fullWidth
            onChange={e => {
              updateRepositorySettings({
                container: e.target.value,
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
                id="xpack.snapshotRestore.repositoryForm.typeAzure.basePathTitle"
                defaultMessage="Base path"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeAzure.basePathDescription"
            defaultMessage="Specifies the path within container to repository data."
          />
        }
        idAria="azureRepositoryBasePathDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeAzure.basePathLabel"
              defaultMessage="Base path"
            />
          }
          fullWidth
          describedByIds={['azureRepositoryBasePathDescription']}
        >
          <EuiFieldText
            defaultValue={base_path || ''}
            fullWidth
            onChange={e => {
              updateRepositorySettings({
                base_path: e.target.value,
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
                id="xpack.snapshotRestore.repositoryForm.typeAzure.compressTitle"
                defaultMessage="Compress"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeAzure.compressDescription"
            defaultMessage="Turns on compression of the snapshot files.
              Compression is applied only to metadata files (index mapping and settings).
              Data files are not compressed."
          />
        }
        idAria="azureRepositoryCompressDescription"
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace={true}
          fullWidth
          describedByIds={['azureRepositoryCompressDescription']}
        >
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeAzure.compressLabel"
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
                id="xpack.snapshotRestore.repositoryForm.typeAzure.chunkSizeTitle"
                defaultMessage="Chunk size"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeAzure.chunkSizeDescription"
            defaultMessage="Big files can be broken down into chunks during snapshotting if needed.
              The chunk size can be specified in bytes or by using size value notation, i.e. 1g, 10m, 5k."
          />
        }
        idAria="azureRepositoryChunkSizeDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeAzure.chunkSizeLabel"
              defaultMessage="Chunk size"
            />
          }
          fullWidth
          describedByIds={['azureRepositoryChunkSizeDescription']}
        >
          <EuiFieldText
            defaultValue={chunk_size || ''}
            fullWidth
            onChange={e => {
              updateRepositorySettings({
                chunk_size: e.target.value,
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
                id="xpack.snapshotRestore.repositoryForm.typeAzure.readonlyTitle"
                defaultMessage="Readonly"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeAzure.readonlyDescription"
            defaultMessage="Makes repository read-only."
          />
        }
        idAria="azureRepositoryReadonlyDescription"
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace={true}
          fullWidth
          describedByIds={['azureRepositoryReadonlyDescription']}
        >
          <EuiSwitch
            disabled={location_mode === locationModeOptions[1].value}
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeAzure.readonlyLabel"
                defaultMessage="Enable readonly"
              />
            }
            checked={!!readonly}
            onChange={e => {
              updateRepositorySettings({
                readonly: location_mode === locationModeOptions[1].value ? true : e.target.checked,
              });
            }}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Location mode field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeAzure.locationModeTitle"
                defaultMessage="Location mode"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeAzure.locationModeDescription"
            defaultMessage="Setting to {secondaryOnly} will force read-only to true."
            values={{
              secondaryOnly: <EuiCode>{locationModeOptions[1].value}</EuiCode>,
            }}
          />
        }
        idAria="azureRepositoryLocationModeDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeAzure.locationModeLabel"
              defaultMessage="Location mode"
            />
          }
          fullWidth
          describedByIds={['azureRepositoryLocationModeDescription']}
        >
          <EuiSelect
            options={locationModeOptions}
            value={location_mode || locationModeOptions[0].value}
            onChange={e => {
              updateRepositorySettings({
                location_mode: e.target.value,
                readonly: e.target.value === locationModeOptions[1].value ? true : readonly,
              });
            }}
            fullWidth
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </Fragment>
  );
};
