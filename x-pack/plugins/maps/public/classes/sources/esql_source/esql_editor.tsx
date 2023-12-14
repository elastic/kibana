/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { isEqual } from 'lodash';
import type { AggregateQuery } from '@kbn/es-query';
import type { ESQLColumn } from '@kbn/es-types';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import { getESQLMeta, verifyGeometryColumn } from './get_esql_meta';

interface Props {
  dateField?: string;
  esql: string;
  onESQLChange: ({ columns, esql }: { columns: ESQLColumn[], esql: string }) => void;
  onDateFieldChange: (dateField?: string) => void;
}

export function ESQLEditor(props: Props) {
  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const [localQuery, setLocalQuery] = useState<AggregateQuery>({ esql: props.esql });
  const [onSubmitQuery, setOnSubmitQuery] = useState<AggregateQuery>({ esql: props.esql });

  const [dateFields, setDateFields] = useState<string[]>([]);
  
  // On submit query change - load columns, date fields, and geo fields
  useEffect(() => {
    let ignore = false;
    setError(undefined);
    setIsLoading(true);
    getESQLMeta((onSubmitQuery as { esql: string }).esql)
      .then((esqlMeta) => {
        if (!ignore) {
          try {
            verifyGeometryColumn(esqlMeta.columns);
            setDateFields(esqlMeta.dateFields);
            props.onESQLChange({
              columns: esqlMeta.columns,
              esql: (onSubmitQuery as { esql: string }).esql
            });
          } catch(getGeometryColumnIndexError) {
            setError(getGeometryColumnIndexError);
          }
          setIsLoading(false);
        }
      })
      .catch((getESQLMetaError) => {
        if (!ignore) {
          setError(getESQLMetaError);
          setIsLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [onSubmitQuery]);

  useEffect(() => {
    if (!props.dateField || !dateFields.includes(props.dateField)) {
      props.onDateFieldChange(dateFields.length ? dateFields[0] : undefined);
    }
  }, [dateFields]);

  return (
    <>
      <TextBasedLangEditor
        query={localQuery}
        onTextLangQueryChange={setLocalQuery}
        onTextLangQuerySubmit={(q) => {
          if (q) {
            setOnSubmitQuery(q);
          }
        }}
        errors={error ? [error] : undefined}
        expandCodeEditor={(status: boolean) => {
          // never called because hideMinimizeButton hides UI
        }}
        isCodeEditorExpanded
        hideMinimizeButton
        editorIsInline
        hideRunQueryText
        disableSubmitAction={isLoading || isEqual(localQuery, onSubmitQuery)}
      />
    </>
  );
}