/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { Index } from '@kbn/index-management-shared-types';
import React from 'react';
import { useMemo } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useUserPrivilegesQuery } from '../../hooks/api/use_user_permissions';

export interface SearchIndexDetailsMappingsProps {
  index?: Index;
}
export const SearchIndexDetailsMappings = ({ index }: SearchIndexDetailsMappingsProps) => {
  const { indexManagement, history } = useKibana().services;

  const IndexMappingComponent = useMemo(
    () => indexManagement.getIndexMappingComponent({ history }),
    [indexManagement, history]
  );
  const { data: userPrivileges } = useUserPrivilegesQuery();
  const hasUpdateMappingsPrivilege = useMemo(() => {
    return userPrivileges?.privileges.canManageIndex === true;
  }, [userPrivileges]);

  return (
    <>
      <EuiSpacer />
      <IndexMappingComponent
        index={index}
        showAboutMappings={false}
        hasUpdateMappingsPrivilege={hasUpdateMappingsPrivilege}
      />
    </>
  );
};
