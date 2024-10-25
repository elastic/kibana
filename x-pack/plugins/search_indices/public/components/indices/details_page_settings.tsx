/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';
import { useUserPrivilegesQuery } from '../../hooks/api/use_user_permissions';

interface SearchIndexDetailsSettingsProps {
  indexName: string;
}
export const SearchIndexDetailsSettings = ({ indexName }: SearchIndexDetailsSettingsProps) => {
  const { indexManagement, history } = useKibana().services;

  const { data: userPrivileges } = useUserPrivilegesQuery();
  const hasUpdateSettingsPrivilege = useMemo(() => {
    return userPrivileges?.privileges.canManageIndex === true;
  }, [userPrivileges]);

  const IndexSettingsComponent = useMemo(
    () => indexManagement.getIndexSettingsComponent({ history }),
    [indexManagement, history]
  );

  return (
    <>
      <EuiSpacer />
      <IndexSettingsComponent
        indexName={indexName}
        hasUpdateSettingsPrivilege={hasUpdateSettingsPrivilege}
      />
    </>
  );
};
