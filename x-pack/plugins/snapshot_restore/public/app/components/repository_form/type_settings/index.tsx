/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { REPOSITORY_TYPES } from '../../../../../common/constants';
import { Repository, RepositoryType } from '../../../../../common/types';
import { useAppDependencies } from '../../../index';
import { cleanSettings } from '../../../services/utils';
import { SectionError } from '../../index';

import { AzureSettings } from './azure_settings';
import { FSSettings } from './fs_settings';
import { GCSSettings } from './gcs_settings';
import { HDFSSettings } from './hdfs_settings';
import { ReadonlySettings } from './readonly_settings';
import { S3Settings } from './s3_settings';

interface Props {
  repository: Repository;
  updateRepository: (updatedFields: Partial<Repository>) => void;
}

export const TypeSettings: React.FunctionComponent<Props> = ({ repository, updateRepository }) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const { type, settings } = repository;
  const updateRepositorySettings = (
    updatedSettings: Partial<Repository['settings']>,
    replaceSettings?: boolean
  ): void => {
    if (replaceSettings) {
      updateRepository({
        settings: cleanSettings(updatedSettings),
      });
    } else {
      updateRepository({
        settings: {
          ...settings,
          ...cleanSettings(updatedSettings),
        },
      });
    }
  };

  const typeSettingsMap: { [key in RepositoryType]: any } = {
    [REPOSITORY_TYPES.fs]: FSSettings,
    [REPOSITORY_TYPES.url]: ReadonlySettings,
    [REPOSITORY_TYPES.azure]: AzureSettings,
    [REPOSITORY_TYPES.gcs]: GCSSettings,
    [REPOSITORY_TYPES.hdfs]: HDFSSettings,
    [REPOSITORY_TYPES.s3]: S3Settings,
  };

  const renderTypeSettings = (repositoryType: RepositoryType) => {
    const RepositorySettings = typeSettingsMap[repositoryType];
    if (RepositorySettings) {
      return (
        <RepositorySettings
          repository={repository}
          updateRepositorySettings={updateRepositorySettings}
        />
      );
    }
    return (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.errorUnknownRepositoryTypesTitle"
            defaultMessage="Unknown repository type"
          />
        }
        error={{
          data: {
            error: i18n.translate(
              'xpack.snapshotRestore.repositoryForm.errorUnknownRepositoryTypesMessage',
              {
                defaultMessage: `The repository type '{type}' is not supported.`,
                values: {
                  type: repositoryType,
                },
              }
            ),
          },
        }}
      />
    );
  };

  return type === REPOSITORY_TYPES.source
    ? renderTypeSettings(settings.delegateType)
    : renderTypeSettings(type);
};
