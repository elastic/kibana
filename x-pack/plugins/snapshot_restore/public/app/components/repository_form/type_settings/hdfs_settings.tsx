/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState } from 'react';
import {
  EuiCode,
  EuiCodeEditor,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import { HDFSRepository, Repository, SourceRepository } from '../../../../../common/types';
import { useAppDependencies } from '../../../index';
import { RepositorySettingsValidation } from '../../../services/validation';

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
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();
  const {
    settings: {
      delegateType,
      uri,
      path,
      loadDefaults,
      compress,
      chunkSize,
      'security.principal': securityPrincipal,
      ...rest // For conf.* settings
    },
  } = repository;
  const hasErrors: boolean = Boolean(Object.keys(settingErrors).length);

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
            defaultMessage="The URI address for HDFS. Required."
          />
        }
        idAria="hdfsRepositoryUriDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeHDFS.uriLabel"
              defaultMessage="URI"
            />
          }
          fullWidth
          describedByIds={['hdfsRepositoryUriDescription']}
          isInvalid={Boolean(hasErrors && settingErrors.uri)}
          error={settingErrors.uri}
        >
          <EuiFieldText
            defaultValue={uri || ''}
            fullWidth
            onChange={e => {
              updateRepositorySettings({
                uri: e.target.value,
              });
            }}
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
            defaultMessage="The file path within the filesystem where data is stored/loaded. Required."
          />
        }
        idAria="hdfsRepositoryPathDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeHDFS.pathLabel"
              defaultMessage="Path"
            />
          }
          fullWidth
          describedByIds={['hdfsRepositoryPathDescription']}
          isInvalid={Boolean(hasErrors && settingErrors.path)}
          error={settingErrors.path}
        >
          <EuiFieldText
            defaultValue={path || ''}
            fullWidth
            onChange={e => {
              updateRepositorySettings({
                path: e.target.value,
              });
            }}
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
            defaultMessage="Whether to load the default Hadoop configuration or not."
          />
        }
        idAria="hdfsRepositoryLoadDefaultsDescription"
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace={true}
          fullWidth
          describedByIds={['hdfsRepositoryLoadDefaultsDescription']}
          isInvalid={Boolean(hasErrors && settingErrors.loadDefaults)}
          error={settingErrors.loadDefaults}
        >
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeHDFS.loadDefaultsLabel"
                defaultMessage="Enable load defaults"
              />
            }
            checked={!(loadDefaults === false)}
            onChange={e => {
              updateRepositorySettings({
                loadDefaults: e.target.checked,
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
                id="xpack.snapshotRestore.repositoryForm.typeHDFS.compressTitle"
                defaultMessage="Compress"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeHDFS.compressDescription"
            defaultMessage="Turns on compression of the snapshot files.
              Compression is applied only to metadata files (index mapping and settings).
              Data files are not compressed."
          />
        }
        idAria="hdfsRepositoryCompressDescription"
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace={true}
          fullWidth
          describedByIds={['hdfsRepositoryCompressDescription']}
          isInvalid={Boolean(hasErrors && settingErrors.compress)}
          error={settingErrors.compress}
        >
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeHDFS.compressLabel"
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
                id="xpack.snapshotRestore.repositoryForm.typeHDFS.chunkSizeTitle"
                defaultMessage="Chunk size"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeHDFS.chunkSizeDescription"
            defaultMessage="Big files can be broken down into chunks during snapshotting if needed.
              The chunk size can be specified in bytes or by using size value notation, i.e. 1g, 10m, 5k."
          />
        }
        idAria="hdfsRepositoryChunkSizeDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeHDFS.chunkSizeLabel"
              defaultMessage="Chunk size"
            />
          }
          fullWidth
          describedByIds={['hdfsRepositoryChunkSizeDescription']}
          isInvalid={Boolean(hasErrors && settingErrors.chunkSize)}
          error={settingErrors.chunkSize}
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
            defaultMessage="Kerberos principal to use when connecting to a secured HDFS cluster."
          />
        }
        idAria="hdfsRepositorySecurityPrincipalDescription"
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
          describedByIds={['hdfsRepositorySecurityPrincipalDescription']}
          isInvalid={Boolean(hasErrors && settingErrors.securityPrincipal)}
          error={settingErrors.securityPrincipal}
        >
          <EuiFieldText
            defaultValue={securityPrincipal || ''}
            fullWidth
            onChange={e => {
              updateRepositorySettings({
                'security.principal': e.target.value,
              });
            }}
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
              defaultMessage="Additional JSON formatted configuration parameters to be added to Hadoop configuration.
                Only client oriented properties from the Hadoop core and HDFS configuration files will be recognized."
            />
            <EuiSpacer size="s" />
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeHDFS.configurationKeyDescription"
              defaultMessage="Keys should be in the format {confKeyFormat}."
              values={{
                confKeyFormat: <EuiCode>{'conf.<key>'}</EuiCode>,
              }}
            />
          </Fragment>
        }
        idAria="hdfsRepositoryConfigurationDescription"
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
          describedByIds={['hdfsRepositoryConfigurationDescription']}
          isInvalid={isConfInvalid}
          error={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeHDFS.configurationFormatError"
              defaultMessage="Invalid JSON format"
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
            aria-label={
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeHDFS.configurationAriaLabel"
                defaultMessage="Additional configuration for HDFS repository '{name}'"
                values={{
                  name,
                }}
              />
            }
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
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </Fragment>
  );
};
