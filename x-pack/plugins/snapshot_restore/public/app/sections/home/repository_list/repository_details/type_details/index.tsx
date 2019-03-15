/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  AzureRepository,
  AzureRepositoryType,
  FSRepository,
  FSRepositoryType,
  GCSRepository,
  GCSRepositoryType,
  HDFSRepository,
  HDFSRepositoryType,
  ReadonlyRepository,
  ReadonlyRepositoryType,
  Repository,
  S3Repository,
  S3RepositoryType,
  SourceRepositoryType,
} from '../../../../../../../common/repository_types';

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
    case FSRepositoryType:
      return <FSDetails repository={repository as FSRepository} />;
      break;
    case ReadonlyRepositoryType:
      return <ReadonlyDetails repository={repository as ReadonlyRepository} />;
      break;
    case SourceRepositoryType:
      const { delegate_type } = settings;
      const delegatedRepository = {
        ...repository,
        type: delegate_type,
      };
      return <TypeDetails repository={delegatedRepository} />;
      break;
    case AzureRepositoryType:
      return <AzureDetails repository={repository as AzureRepository} />;
      break;
    case GCSRepositoryType:
      return <GCSDetails repository={repository as GCSRepository} />;
      break;
    case HDFSRepositoryType:
      return <HDFSDetails repository={repository as HDFSRepository} />;
      break;
    case S3RepositoryType:
      return <S3Details repository={repository as S3Repository} />;
      break;
    default:
      return <DefaultDetails repository={repository} />;
      break;
  }
};
