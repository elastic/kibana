/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { REPOSITORY_TYPES } from '../../../../../common/constants';
import {
  AzureRepository,
  FSRepository,
  GCSRepository,
  HDFSRepository,
  ReadonlyRepository,
  Repository,
  RepositoryType,
  S3Repository,
} from '../../../../../common/types';
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
  onRepositoryChange: (repository: Repository) => void;
}

export const TypeSettings: React.FunctionComponent<Props> = ({
  repository,
  onRepositoryChange,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const { type, settings } = repository;
  const onSettingsChange = (newSettings: Repository['settings']) => {
    onRepositoryChange({
      ...repository,
      settings: cleanSettings(newSettings),
    });
  };

  const renderTypeSettings = (repositoryType: RepositoryType) => {
    switch (repositoryType) {
      case REPOSITORY_TYPES.fs:
        return (
          <FSSettings repository={repository as FSRepository} onSettingsChange={onSettingsChange} />
        );
        break;
      case REPOSITORY_TYPES.url:
        return (
          <ReadonlySettings
            repository={repository as ReadonlyRepository}
            onSettingsChange={onSettingsChange}
          />
        );
        break;
      case REPOSITORY_TYPES.azure:
        return (
          <AzureSettings
            repository={repository as AzureRepository}
            onSettingsChange={onSettingsChange}
          />
        );
        break;
      case REPOSITORY_TYPES.gcs:
        return (
          <GCSSettings
            repository={repository as GCSRepository}
            onSettingsChange={onSettingsChange}
          />
        );
        break;
      case REPOSITORY_TYPES.hdfs:
        return (
          <HDFSSettings
            repository={repository as HDFSRepository}
            onSettingsChange={onSettingsChange}
          />
        );
        break;
      case REPOSITORY_TYPES.s3:
        return (
          <S3Settings repository={repository as S3Repository} onSettingsChange={onSettingsChange} />
        );
        break;
      default:
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
    }
  };

  return type === REPOSITORY_TYPES.source
    ? renderTypeSettings(settings.delegate_type)
    : renderTypeSettings(type);
};
