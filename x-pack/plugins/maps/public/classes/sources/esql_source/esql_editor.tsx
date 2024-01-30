/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import useMountedState from 'react-use/lib/useMountedState';
import type { AggregateQuery } from '@kbn/es-query';
import type { ESQLColumn } from '@kbn/es-types';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import { getESQLMeta, verifyGeometryColumn } from './esql_utils';

interface Props {
  esql: string;
  onESQLChange: ({
    columns,
    dateFields,
    geoFields,
    esql,
  }: {
    columns: ESQLColumn[];
    dateFields: string[];
    geoFields: string[];
    esql: string;
  }) => void;
}

export function ESQLEditor(props: Props) {
  const isMounted = useMountedState();

  const [error, setError] = useState<Error | undefined>();
  const [warning, setWarning] = useState<string | undefined>();
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

          if (warning) {
            setWarning(undefined);
          }
          if (error) {
            setError(undefined);
          }
          setIsLoading(true);

          try {
            const esql = (query as { esql: string }).esql;
            const esqlMeta = await getESQLMeta(esql);
            if (!isMounted()) {
              return;
            }
            verifyGeometryColumn(esqlMeta.columns);
            if (esqlMeta.columns.length >= 6) {
              setWarning(
                i18n.translate('xpack.maps.esqlSource.tooManyColumnsWarning', {
                  defaultMessage: `ES|QL statement returns {count} columns. For faster maps, use 'DROP' or 'KEEP' to narrow columns.`,
                  values: {
                    count: esqlMeta.columns.length,
                  },
                })
              );
            }
            props.onESQLChange({
              esql,
              ...esqlMeta,
            });
          } catch (err) {
            if (!isMounted()) {
              return;
            }
            setError(err);
            props.onESQLChange({
              columns: [],
              dateFields: [],
              geoFields: [],
              esql: '',
            });
          }

          setIsLoading(false);
        }}
        errors={error ? [error] : undefined}
        warning={warning}
        expandCodeEditor={(status: boolean) => {
          // never called because hideMinimizeButton hides UI
        }}
        isCodeEditorExpanded
        hideMinimizeButton
        editorIsInline
        hideRunQueryText
        isLoading={isLoading}
        disableSubmitAction={isEqual(localQuery, props.esql)}
      />
    </>
  );
}
