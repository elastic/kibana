/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { isEqual } from 'lodash';
import { EuiSkeletonText } from '@elastic/eui';
import type { AggregateQuery } from '@kbn/es-query';
import { fetchFieldsFromESQL } from '@kbn/text-based-editor';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import { ES_GEO_FIELD_TYPE } from '../../../../common/constants';
import { getIndexPatternService, getExpressionsService } from '../../../kibana_services';
import { getColumns } from './get_columns';

interface Props {

}

export function CreateSourceEditor(props: Props) {
  const prevQuery = useRef<AggregateQuery>({ esql: '' });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState<AggregateQuery>({ esql: '' });

  useEffect(() => {
    let ignore = false;
    getIndexPatternService().getDefaultDataView()
      .then((defaultDataView) => {
        if (!ignore) {
          if (defaultDataView) {
            const geoField = defaultDataView.fields.find((field) => {
              return ES_GEO_FIELD_TYPE.GEO_POINT === field.type;
            });
            if (geoField) {
              setQuery({ esql: `from ${defaultDataView.getIndexPattern()} | KEEP ${geoField.name} | limit 10000` });
            }
          }
          setIsInitialized(true);
        }
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

  return (
    <EuiSkeletonText
        lines={3}
        isLoading={!isInitialized}
      >
      <TextBasedLangEditor
        query={query}
        onTextLangQueryChange={setQuery}
        onTextLangQuerySubmit={async (q) => {
          prevQuery.current = q;
          setQuery(q);
          if (q) {
            setIsLoading(true);
            //const out = await fetchFieldsFromESQL({ esql: query.esql + ' | limit 0' }, getExpressionsService());
            //console.log('out', out);
            await getColumns(query.esql);
            setIsLoading(false);
          }
        }}
        expandCodeEditor={(status: boolean) => {
          // never called because hideMinimizeButton hides UI
        }}
        isCodeEditorExpanded
        hideMinimizeButton
        editorIsInline
        hideRunQueryText
        disableSubmitAction={isLoading || !query || isEqual(query, prevQuery.current)}
      />
    </EuiSkeletonText>
  );
}