/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { Repository } from '../../../common/types';

interface Props {
  children: (deleteRepository: DeleteRepository) => React.ReactElement;
}

type DeleteRepository = (names: Array<Repository['name']>) => void;

export const RepositoryDeleteProvider: React.FunctionComponent<Props> = ({ children }) => {
  const [repositoryNames, setRepositoryNames] = useState<Array<Repository['name']>>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const deleteRepository: DeleteRepository = names => {
    setIsModalOpen(true);
    setRepositoryNames(names);
  };

  if (isModalOpen && repositoryNames.length) {
    /* placeholder */
  }

  return children(deleteRepository);
};
