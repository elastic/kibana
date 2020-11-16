/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
    setKqlSyntax(localStorage.getItem(KQL_SYNTAX_LOCAL_STORAGE) === 'true');
  }, []);

  useEffect(() => {
    localStorage.setItem(KQL_SYNTAX_LOCAL_STORAGE, String(kqlSyntax));
  }, [kqlSyntax]);

  return { kqlSyntax, setKqlSyntax };
};
