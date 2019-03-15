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
  SourceRepository,
  SourceRepositoryType,
} from '../../../../../../../common/repository_types';
import { DefaultDetails } from './default_details';
import { FSDetails } from './fs_details';

interface Props {
  repository: Repository;
}

export const TypeDetails = ({ repository }: Props) => {
  const { type, settings } = repository;
  switch (type) {
    case FSRepositoryType:
      return <FSDetails repository={repository as FSRepository} />;
      break;
    case SourceRepositoryType:
      const { delegate_type } = settings;
      const delegatedRepository = {
        ...repository,
        type: delegate_type,
      };
      return <TypeDetails repository={delegatedRepository} />;
      break;
    default:
      return <DefaultDetails repository={repository} />;
      break;
  }
};
