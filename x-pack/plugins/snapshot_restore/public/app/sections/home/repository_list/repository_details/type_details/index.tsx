/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  AzureRepository,
  FSRepository,
  GCSRepository,
  HDFSRepository,
  ReadonlyRepository,
  Repository,
  RepositoryTypes,
  S3Repository,
} from '../../../../../../../common/types/repository_types';

import { AzureDetails } from './azure_details';
import { DefaultDetails } from './default_details';
import { FSDetails } from './fs_details';
import { GCSDetails } from './gcs_details';
import { HDFSDetails } from './hdfs_details';
import { ReadonlyDetails } from './readonly_details';
import { S3Details } from './s3_details';

interface Props {
  repository: Repository;
}

export const TypeDetails = ({ repository }: Props) => {
  const { type, settings } = repository;
  switch (type) {
    case RepositoryTypes.fs:
      return <FSDetails repository={repository as FSRepository} />;
      break;
    case RepositoryTypes.url:
      return <ReadonlyDetails repository={repository as ReadonlyRepository} />;
      break;
    case RepositoryTypes.source:
      const { delegate_type } = settings;
      const delegatedRepository = {
        ...repository,
        type: delegate_type,
      };
      return <TypeDetails repository={delegatedRepository} />;
      break;
    case RepositoryTypes.azure:
      return <AzureDetails repository={repository as AzureRepository} />;
      break;
    case RepositoryTypes.gcs:
      return <GCSDetails repository={repository as GCSRepository} />;
      break;
    case RepositoryTypes.hdfs:
      return <HDFSDetails repository={repository as HDFSRepository} />;
      break;
    case RepositoryTypes.s3:
      return <S3Details repository={repository as S3Repository} />;
      break;
    default:
      return <DefaultDetails repository={repository} />;
      break;
  }
};
