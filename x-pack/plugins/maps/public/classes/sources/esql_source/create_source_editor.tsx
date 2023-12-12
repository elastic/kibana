/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { isEqual } from 'lodash';
import { EuiSkeletonText } from '@elastic/eui';
import type { AggregateQuery } from '@kbn/es-query';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import { ES_GEO_FIELD_TYPE } from '../../../../common/constants';
import { getIndexPatternService } from '../../../kibana_services';
import { getEsqlMeta } from './get_esql_meta';

interface Props {

}

export function CreateSourceEditor(props: Props) {
  const [error, setError] = useState<Error | undefined>();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState<AggregateQuery>({ esql: '' });
  const [onSubmitQuery, setOnSubmitQuery] = useState<AggregateQuery>({ esql: '' });

  // On page load - create default query from default data view
  useEffect(() => {
    let ignore = false;
    getIndexPatternService().getDefaultDataView()
      .then((defaultDataView) => {
        if (ignore) {
          return;
        }

        if (!defaultDataView) {
          setIsInitialized(true);
          return;
        }

        const geoField = defaultDataView.fields.find((field) => {
          return ES_GEO_FIELD_TYPE.GEO_POINT === field.type;
        });
        if (!geoField) {
          setIsInitialized(true);
          return;
        }

        // setIsInitialized set by effect when onSubmitQuery changed
        setOnSubmitQuery({ esql: `from ${defaultDataView.getIndexPattern()} | KEEP ${geoField.name} | limit 10000` });
      })
      .catch((err) => {
        if (!ignore) {
          setIsInitialized(true);
        }
      });
    return () => {
      ignore = true;
    };
    // only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On submit query change - load columns, date fields, and geo fields
  useEffect(() => {
    let ignore = false;
    setError(undefined);
    setIsLoading(true);
    if (!isEqual(query, onSubmitQuery)) {
      setQuery(onSubmitQuery);
    }
    getEsqlMeta(onSubmitQuery.esql)
      .then((esqlMeta) => {
        console.log(esqlMeta);
        if (ignore) {
          return;
        }

        if (!isInitialized) {
          setIsInitialized(true);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (ignore) {
          return;
        }

        setError(err);
        if (!isInitialized) {
          setIsInitialized(true);
        }
        setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [onSubmitQuery]);

  return (
    <EuiSkeletonText
        lines={3}
        isLoading={!isInitialized}
      >
      <TextBasedLangEditor
        query={query}
        onTextLangQueryChange={setQuery}
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
        disableSubmitAction={isLoading || !query || isEqual(query, onSubmitQuery)}
      />
    </EuiSkeletonText>
  );
}