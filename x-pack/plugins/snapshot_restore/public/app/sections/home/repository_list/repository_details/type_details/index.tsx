/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { REPOSITORY_TYPES } from '../../../../../../../common/constants';
import {
  AzureRepository,
  FSRepository,
  GCSRepository,
  HDFSRepository,
  ReadonlyRepository,
  Repository,
  S3Repository,
} from '../../../../../../../common/types';

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

export const TypeDetails: React.FunctionComponent<Props> = ({ repository }) => {
  const { type, settings } = repository;
  switch (type) {
    case REPOSITORY_TYPES.fs:
      return <FSDetails repository={repository as FSRepository} />;
      break;
    case REPOSITORY_TYPES.url:
      return <ReadonlyDetails repository={repository as ReadonlyRepository} />;
      break;
    case REPOSITORY_TYPES.source:
      const { delegate_type } = settings;
      const delegatedRepository = {
        ...repository,
        type: delegate_type,
      };
      return <TypeDetails repository={delegatedRepository} />;
      break;
    case REPOSITORY_TYPES.azure:
      return <AzureDetails repository={repository as AzureRepository} />;
      break;
    case REPOSITORY_TYPES.gcs:
      return <GCSDetails repository={repository as GCSRepository} />;
      break;
    case REPOSITORY_TYPES.hdfs:
      return <HDFSDetails repository={repository as HDFSRepository} />;
      break;
    case REPOSITORY_TYPES.s3:
      return <S3Details repository={repository as S3Repository} />;
      break;
    default:
      return <DefaultDetails repository={repository} />;
      break;
  }
};
