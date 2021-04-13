/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { find } from 'lodash/fp';
// import { EuiCodeBlock, EuiSuperSelect, EuiText, EuiSpacer } from '@elastic/eui';
import React, { useCallback } from 'react';
// import { useQuery } from 'react-query';

import { FieldHook } from '../../shared_imports';
// import { useKibana } from '../../common/lib/kibana';
import { OsqueryEditor } from '../../editor';

interface LiveQueryQueryFieldProps {
  field: FieldHook<{
    id: string | null;
    query: string;
  }>;
}

const LiveQueryQueryFieldComponent: React.FC<LiveQueryQueryFieldProps> = ({ field }) => {
  // const { http } = useKibana().services;
  // const { data } = useQuery('savedQueryList', () =>
  //   http.get('/internal/osquery/saved_query', {
  //     query: {
  //       pageIndex: 0,
  //       pageSize: 100,
  //       sortField: 'updated_at',
  //       sortDirection: 'desc',
  //     },
  //   })
  // );

  // const queryOptions =
  //   // @ts-expect-error update types
  //   data?.saved_objects.map((savedQuery) => ({
  //     value: savedQuery,
  //     inputDisplay: savedQuery.attributes.name,
  //     dropdownDisplay: (
  //       <>
  //         <strong>{savedQuery.attributes.name}</strong>
  //         <EuiText size="s" color="subdued">
  //           <p className="euiTextColor--subdued">{savedQuery.attributes.description}</p>
  //         </EuiText>
  //         <EuiCodeBlock language="sql" fontSize="s" paddingSize="s">
  //           {savedQuery.attributes.query}
  //         </EuiCodeBlock>
  //       </>
  //     ),
  //   })) ?? [];

  const { value, setValue } = field;

  // const handleSavedQueryChange = useCallback(
  //   (newValue) => {
  //     setValue({
  //       id: newValue.id,
  //       query: newValue.attributes.query,
  //     });
  //   },
  //   [setValue]
  // );

  const handleEditorChange = useCallback(
    (newValue) => {
      setValue({
        id: null,
        query: newValue,
      });
    },
    [setValue]
  );

  return (
    <>
      {/* <EuiSuperSelect
        valueOfSelected={find(['id', value.id], data?.saved_objects)}
        options={queryOptions}
        onChange={handleSavedQueryChange}
      />
      <EuiSpacer /> */}
      <OsqueryEditor defaultValue={value.query} onChange={handleEditorChange} />
    </>
  );
};

export const LiveQueryQueryField = React.memo(LiveQueryQueryFieldComponent);
