/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Index, IndexMappingProps } from '@kbn/index-management-shared-types';
import React from 'react';
import { useMemo } from 'react';
export interface SearchIndexDetailsMappingsProps {
  IndexMappingComponent?: React.FC<IndexMappingProps>;
  index?: Index;
}
export const SearchIndexDetailsMappings = ({
  IndexMappingComponent,
  index,
}: SearchIndexDetailsMappingsProps) => {
  const MappingsComponent = useMemo(() => {
    return (
      <>
        <EuiSpacer />
        {IndexMappingComponent ? (
          <IndexMappingComponent index={index} showAboutMappings={false} />
        ) : (
          <EuiCallOut
            color="danger"
            iconType="warn"
            title={i18n.translate('xpack.searchIndices.mappings.noMappingsComponent', {
              defaultMessage: 'Mappings component not found',
            })}
          />
        )}
      </>
    );
  }, [IndexMappingComponent, index]);
  return <>{MappingsComponent && MappingsComponent}</>;
};
