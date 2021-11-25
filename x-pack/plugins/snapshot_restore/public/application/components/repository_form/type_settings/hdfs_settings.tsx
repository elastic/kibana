/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiCode,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFormRow,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { HDFSRepository, Repository, SourceRepository } from '../../../../../common/types';
import { EuiCodeEditor } from '../../../../shared_imports';
import { RepositorySettingsValidation } from '../../../services/validation';
import { ChunkSizeField, MaxSnapshotsField, MaxRestoreField } from './common';

interface Props {
  repository: HDFSRepository | SourceRepository<HDFSRepository>;
  updateRepositorySettings: (
    updatedSettings: Partial<Repository['settings']>,
    replaceSettings?: boolean
  ) => void;
  settingErrors: RepositorySettingsValidation;
}

export const HDFSSettings: React.FunctionComponent<Props> = ({
  repository,
  updateRepositorySettings,
  settingErrors,
}) => {
  const {
    name,
    settings: {
      delegateType,
      uri,
      path,
      loadDefaults,
      compress,
      chunkSize,
      maxRestoreBytesPerSec,
      maxSnapshotBytesPerSec,
      readonly,
      'security.principal': securityPrincipal,
      ...rest // For conf.* settings
    },
  } = repository;
  const hasErrors: boolean = Boolean(Object.keys(settingErrors).length);
  const updateSettings = (settingName: string, value: string) => {
    updateRepositorySettings({
      [settingName]: value,
    });
  };

  const [additionalConf, setAdditionalConf] = useState<string>(JSON.stringify(rest, null, 2));
  const [isConfInvalid, setIsConfInvalid] = useState<boolean>(false);

  return (
    <Fragment>
      {/* URI field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeHDFS.uriTitle"
                defaultMessage="URI"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeHDFS.uriDescription"
            defaultMessage="The URI address for HDFS."
          />
        }
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeHDFS.uriLabel"
              defaultMessage="URI (required)"
            />
          }
          fullWidth
          isInvalid={Boolean(hasErrors && settingErrors.uri)}
          error={settingErrors.uri}
        >
          <EuiFieldText
            prepend={
              <EuiText size="s" id="hdfsRepositoryUriProtocolDescription">
                {/* Wrap as string due to prettier not parsing `//` inside JSX correctly (prettier/prettier#2347) */}
                {'hdfs://'}
              </EuiText>
            }
            defaultValue={uri ? uri.split('hdfs://')[1] : ''}
            fullWidth
            onChange={(e) => {
              updateRepositorySettings({
                uri: e.target.value ? `hdfs://${e.target.value}` : '',
              });
            }}
            aria-describedby="hdfsRepositoryUriProtocolDescription"
            data-test-subj="uriInput"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Path field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeHDFS.pathTitle"
                defaultMessage="Path"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeHDFS.pathDescription"
            defaultMessage="The file path where data is stored."
          />
        }
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeHDFS.pathLabel"
              defaultMessage="Path (required)"
            />
          }
          fullWidth
          isInvalid={Boolean(hasErrors && settingErrors.path)}
          error={settingErrors.path}
        >
          <EuiFieldText
            defaultValue={path || ''}
            fullWidth
            onChange={(e) => {
              updateRepositorySettings({
                path: e.target.value,
              });
            }}
            data-test-subj="pathInput"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Load defaults field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeHDFS.loadDefaultsTitle"
                defaultMessage="Load defaults"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeHDFS.loadDefaultsDescription"
            defaultMessage="Loads the default Hadoop configuration."
          />
        }
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace={true}
          fullWidth
          isInvalid={Boolean(hasErrors && settingErrors.loadDefaults)}
          error={settingErrors.loadDefaults}
        >
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeHDFS.loadDefaultsLabel"
                defaultMessage="Load defaults"
              />
            }
            checked={!(loadDefaults === false)}
            onChange={(e) => {
              updateRepositorySettings({
                loadDefaults: e.target.checked,
              });
            }}
            data-test-subj="loadDefaultsToggle"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Compress field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeHDFS.compressTitle"
                defaultMessage="Snapshot compression"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeHDFS.compressDescription"
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
                id="xpack.snapshotRestore.repositoryForm.typeHDFS.compressLabel"
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

      {/* Security principal field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeHDFS.securityPrincipalTitle"
                defaultMessage="Security principal"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeHDFS.securityPrincipalDescription"
            defaultMessage="The Kerberos principal to use when connecting to a secured HDFS cluster."
          />
        }
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeHDFS.securityPrincipalLabel"
              defaultMessage="Security principal"
            />
          }
          fullWidth
          isInvalid={Boolean(hasErrors && settingErrors.securityPrincipal)}
          error={settingErrors.securityPrincipal}
        >
          <EuiFieldText
            defaultValue={securityPrincipal || ''}
            fullWidth
            onChange={(e) => {
              updateRepositorySettings({
                'security.principal': e.target.value,
              });
            }}
            data-test-subj="securityPrincipalInput"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Additional HDFS parameters field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeHDFS.configurationTitle"
                defaultMessage="Configuration"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <Fragment>
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeHDFS.configurationDescription"
              defaultMessage="Additional JSON format configuration parameters to add to the Hadoop configuration. Only client-oriented properties from the Hadoop core and HDFS files are recognized."
            />
          </Fragment>
        }
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeHDFS.configurationLabel"
              defaultMessage="Configuration"
            />
          }
          fullWidth
          isInvalid={isConfInvalid}
          error={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeHDFS.configurationFormatError"
              defaultMessage="Invalid JSON format"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeHDFS.configurationKeyDescription"
              defaultMessage="Keys should be in the format {confKeyFormat}."
              values={{
                confKeyFormat: <EuiCode>{'conf.<key>'}</EuiCode>,
              }}
            />
          }
        >
          <EuiCodeEditor
            mode="json"
            theme="textmate"
            width="100%"
            value={additionalConf}
            setOptions={{
              showLineNumbers: false,
              tabSize: 2,
              maxLines: Infinity,
            }}
            editorProps={{
              $blockScrolling: Infinity,
            }}
            showGutter={false}
            minLines={6}
            aria-label={i18n.translate(
              'xpack.snapshotRestore.repositoryForm.typeHDFS.configurationAriaLabel',
              {
                defaultMessage: `Additional configuration for HDFS repository '{name}'`,
                values: { name },
              }
            )}
            onChange={(value: string) => {
              setAdditionalConf(value);
              try {
                const parsedConf = JSON.parse(value);
                setIsConfInvalid(false);
                updateRepositorySettings(
                  {
                    delegateType,
                    uri,
                    path,
                    loadDefaults,
                    compress,
                    chunkSize,
                    'security.principal': securityPrincipal,
                    ...parsedConf,
                  },
                  true
                );
              } catch (e) {
                setIsConfInvalid(true);
              }
            }}
            data-test-subj="codeEditor"
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
                id="xpack.snapshotRestore.repositoryForm.typeHDFS.readonlyTitle"
                defaultMessage="Read-only"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeHDFS.readonlyDescription"
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
                id="xpack.snapshotRestore.repositoryForm.typeHDFS.readonlyLabel"
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
