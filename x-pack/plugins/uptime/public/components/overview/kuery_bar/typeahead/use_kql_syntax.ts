/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { KQL_SYNTAX_LOCAL_STORAGE } from '../../../../../common/constants';
import { useUrlParams } from '../../../../hooks';

interface Props {
  setValue: React.Dispatch<React.SetStateAction<string>>;
}

export const useKqlSyntax = ({ setValue }: Props) => {
  const [kqlSyntax, setKqlSyntax] = useState(
    localStorage.getItem(KQL_SYNTAX_LOCAL_STORAGE) === 'true'
  );

  const [getUrlParams] = useUrlParams();

  const { query, search } = getUrlParams();

  useEffect(() => {
    setValue(query || '');
  }, [query, setValue]);

  useEffect(() => {
    setValue(search || '');
  }, [search, setValue]);

  useEffect(() => {
    if (query || search) {
      // if url has query or params we will give them preference on load
      // for selecting syntax type
      if (query) {
        setKqlSyntax(false);
      }
      if (search) {
        setKqlSyntax(true);
      }
    } else {
      setKqlSyntax(localStorage.getItem(KQL_SYNTAX_LOCAL_STORAGE) === 'true');
    }
    // This part is meant to run only when component loads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem(KQL_SYNTAX_LOCAL_STORAGE, String(kqlSyntax));
    setValue('');
  }, [kqlSyntax, setValue]);

  return { kqlSyntax, setKqlSyntax };
};
