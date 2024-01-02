/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState } from 'react';
import { useKibana } from '../services';

export const useUserName = () => {
  const [userName, setUserName] = useState<string>();
  const {
    services: {
      security: { authc },
    },
  } = useKibana();
  useEffect(() => {
    const getUser = async () => {
      const { username } = await authc.getCurrentUser();
      setUserName(username);
    };

    getUser();
  });

  return userName;
};
