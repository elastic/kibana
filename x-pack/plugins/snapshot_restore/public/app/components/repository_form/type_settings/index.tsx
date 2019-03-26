/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { REPOSITORY_TYPES } from '../../../../../common/constants';
import { Repository } from '../../../../../common/types';
import { DefaultSettings } from './default_settings';

interface Props {
  repository: Repository;
  onRepositoryChange: (repository: Repository) => void;
}

export const TypeSettings: React.FunctionComponent<Props> = ({
  repository,
  onRepositoryChange,
}) => {
  const { type, settings } = repository;
  switch (type) {
    default:
      return <DefaultSettings repository={repository} onChange={onRepositoryChange} />;
  }
};
