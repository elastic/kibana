/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { REPOSITORY_TYPES } from '../../../../../common/constants';
import { FSRepository, ReadonlyRepository, Repository } from '../../../../../common/types';
import { cleanSettings } from '../../../services/utils';

import { DefaultSettings } from './default_settings';
import { FSSettings } from './fs_settings';
import { ReadonlySettings } from './readonly_settings';

interface Props {
  repository: Repository;
  onRepositoryChange: (repository: Repository) => void;
}

export const TypeSettings: React.FunctionComponent<Props> = ({
  repository,
  onRepositoryChange,
}) => {
  const { type, settings } = repository;
  const onSettingsChange = (newSettings: Repository['settings']) => {
    onRepositoryChange({
      ...repository,
      settings: cleanSettings(newSettings),
    });
  };
  switch (type) {
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
    case REPOSITORY_TYPES.source:
      const { delegate_type } = settings;
      const delegatedRepository = {
        ...repository,
        type: delegate_type,
      };
      return (
        <TypeSettings repository={delegatedRepository} onRepositoryChange={onRepositoryChange} />
      );
      break;
    default:
      return <DefaultSettings repository={repository} onSettingsChange={onSettingsChange} />;
  }
};
