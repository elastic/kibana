/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState } from 'react';
import { Repository } from '../../../common/repository_types';

interface Props {
  children: any;
}

export const RepositoryDeleteProvider = ({ children }: Props) => {
  const [repositoryNames, setRepositoryNames] = useState<Array<Repository['name']>>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const deleteRepository = (names: Array<Repository['name']>): void => {
    setIsModalOpen(true);
    setRepositoryNames(names);
  };
  return <Fragment>{children(deleteRepository)}</Fragment>;
};
