/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { AggregateQuery } from '@kbn/es-query';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import type { EsqlColumn } from '../../../../common/descriptor_types';
import { getEsqlMeta } from './get_esql_meta';

interface Props {
  dateField?: string;
  geoField?: string;
  esql: string;
  onEsqlChange: ({ columns, esql }: { columns: EsqlColumn[], esql: string }) => void;
  onDateFieldChange: (dateField?: string) => void;
  onGeoFieldChange: (geoField?: string) => void;
}

export function EsqlEditor(props: Props) {
  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const [localQuery, setLocalQuery] = useState<AggregateQuery>({ esql: props.esql });
  const [onSubmitQuery, setOnSubmitQuery] = useState<AggregateQuery>({ esql: props.esql });

  const [dateFields, setDateFields] = useState<string[]>([]);
  const [geoFields, setGeoFields] = useState<string[]>([]);
  //const [filterByMapBounds, setFilterByMapBounds] = useState(false);
  //const [filterByTimeBounds, setFilterBytimeBounds] = useState(false);

  // On submit query change - load columns, date fields, and geo fields
  useEffect(() => {
    let ignore = false;
    setError(undefined);
    setIsLoading(true);
    if (!isEqual(localQuery, onSubmitQuery)) {
      setLocalQuery(onSubmitQuery);
    }
    getEsqlMeta((onSubmitQuery as { esql: string }).esql)
      .then((esqlMeta) => {
        if (ignore) {
          return;
        }
        console.log(esqlMeta);
        
        setIsLoading(false);
        const hasGeoColumn = esqlMeta.columns.some(column => {
          return column.type === 'geo_point';
        });
        if (hasGeoColumn) {
          setDateFields(esqlMeta.dateFields);
          setGeoFields(esqlMeta.geoFields);
          props.onEsqlChange({
            columns: esqlMeta.columns,
            esql: (onSubmitQuery as { esql: string }).esql
          });
        } else {
          setError(new Error(i18n.translate('xpack.maps.source.esql.noGeoColumnErrorMsg', {
            defaultMessage: 'Elasticsearch ES|QL query does not return a geospatial column.',
          })));
        }
      })
      .catch((err) => {
        if (ignore) {
          return;
        }

        setError(err);
        setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [onSubmitQuery]);

  useEffect(() => {
    if (!isEqual(props.esql, onSubmitQuery)) {
      setOnSubmitQuery({ esql: props.esql });
    }
  }, [props.esql]);

  useEffect(() => {
    if (props.dateField && !dateFields.includes(props.dateField)) {
      props.onDateFieldChange(dateFields.length ? dateFields[0] : undefined);
    }
  }, [dateFields]);

  useEffect(() => {
    if (props.geoField && !geoFields.includes(props.geoField)) {
      props.onGeoFieldChange(geoFields.length ? geoFields[0] : undefined);
    }
  }, [geoFields]);

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