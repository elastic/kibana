/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { isEqual } from 'lodash';
import useMountedState from 'react-use/lib/useMountedState';
import type { AggregateQuery } from '@kbn/es-query';
import type { ESQLColumn } from '@kbn/es-types';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import { getESQLMeta, verifyGeometryColumn } from './esql_utils';

interface Props {
  esql: string;
  onESQLChange: ({ columns, dateFields, esql }: { columns: ESQLColumn[], dateFields: string[], esql: string }) => void;
}

export function ESQLEditor(props: Props) {
  const isMounted = useMountedState();

  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [localQuery, setLocalQuery] = useState<AggregateQuery>({ esql: props.esql });

  return (
    <>
      <TextBasedLangEditor
        query={localQuery}
        onTextLangQueryChange={setLocalQuery}
        onTextLangQuerySubmit={async (query) => {
          if (!query) {
            return;
          }
          
          setError(undefined);
          setIsLoading(true);

          try {
            const esql = (query as { esql: string }).esql;
            const esqlMeta = await getESQLMeta(esql);
            if (!isMounted()) {
              return;
            }
            verifyGeometryColumn(esqlMeta.columns);
            props.onESQLChange({
              columns: esqlMeta.columns,
              dateFields: esqlMeta.dateFields,
              esql,
            });
          } catch(error) {
            if (!isMounted()) {
              return;
            }
            setError(error);
            props.onESQLChange({
              columns: [],
              dateFields: [],
              esql: '',
            });
          }

          setIsLoading(false);
        }}
        errors={error ? [error] : undefined}
        expandCodeEditor={(status: boolean) => {
          // never called because hideMinimizeButton hides UI
        }}
        isCodeEditorExpanded
        hideMinimizeButton
        editorIsInline
        hideRunQueryText
        disableSubmitAction={isLoading || isEqual(localQuery, props.esql)}
      />
    </>
  );
}