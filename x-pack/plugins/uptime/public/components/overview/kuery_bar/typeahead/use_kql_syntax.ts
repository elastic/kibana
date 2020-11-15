/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { KQL_SYNTAX_LOCAL_STORAGE } from '../../../../../common/constants';

export const useKqlSyntax = () => {
  const [kqlSyntax, setKqlSyntax] = useState(
    localStorage.getItem(KQL_SYNTAX_LOCAL_STORAGE) === 'true'
  );

  useEffect(() => {
    setKqlSyntax(localStorage.getItem(KQL_SYNTAX_LOCAL_STORAGE) === 'true');
  }, []);

  useEffect(() => {
    localStorage.setItem(KQL_SYNTAX_LOCAL_STORAGE, String(kqlSyntax));
  }, [kqlSyntax]);

  return { kqlSyntax, setKqlSyntax };
};
