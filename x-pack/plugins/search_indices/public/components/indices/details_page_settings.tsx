/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useMemo } from 'react';
import { useKibana } from '../../hooks/use_kibana';

interface SearchIndexDetailsSettingsProps {
  indexName: string;
}
export const SearchIndexDetailsSettings = ({ indexName }: SearchIndexDetailsSettingsProps) => {
  const { indexManagement, history } = useKibana().services;

  const IndexSettingsComponent = useMemo(
    () => indexManagement.getIndexSettingsComponent({ history }),
    [indexManagement, history]
  );

  return <IndexSettingsComponent indexName={indexName} />;
};
