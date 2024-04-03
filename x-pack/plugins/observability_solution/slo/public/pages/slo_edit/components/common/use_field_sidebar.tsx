/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, SetStateAction } from 'react';
import { UnifiedFieldListSidebarContainer } from '@kbn/unified-field-list';
import { DataView } from '@kbn/data-views-plugin/common';
import { useKibana } from '../../../../utils/kibana_react';

export const useFieldSidebar = ({
  dataView,
  columns,
  setColumns,
}: {
  dataView: DataView;
  columns: string[];
  setColumns: React.Dispatch<SetStateAction<string[]>>;
}) => {
  const services = useKibana().services;

  return useMemo(() => {
    return (
      <UnifiedFieldListSidebarContainer
        services={{
          core: services,
          ...services,
        }}
        dataView={dataView}
        workspaceSelectedFieldNames={columns}
        allFields={dataView.fields}
        onAddFieldToWorkspace={(field) => {
          setColumns((prevColumns) => [
            ...(prevColumns.length === 0 ? ['@timestamp'] : prevColumns),
            field.name,
          ]);
        }}
        onRemoveFieldFromWorkspace={(field) => {
          setColumns((prevColumns) => prevColumns.filter((c) => c !== field.name));
        }}
        getCreationOptions={() => ({
          originatingApp: 'observability',
        })}
      />
    );
  }, [columns, dataView, services, setColumns]);
};
