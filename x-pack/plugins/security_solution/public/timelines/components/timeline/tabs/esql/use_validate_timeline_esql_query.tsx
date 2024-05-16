/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregateQuery } from '@kbn/es-query';
import type { EditorError, ESQLAst } from '@kbn/esql-ast';
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import { useCallback, useEffect, useMemo, useState } from 'react';
interface UseValidateTimelineESQLQueryArgs {
  query: AggregateQuery;
}

export function useValidateTimelineESQLQuery(query: AggregateQuery) {
  const [errors, setErrors] = useState<EditorError[]>([]);

  const [ast, setAst] = useState<ESQLAst>(getAstAndSyntaxErrors(query.esql).ast);

  const parseQuery = useCallback(() => {
    const { ast: _ast, errors: _errors } = getAstAndSyntaxErrors(query.esql);
    setAst(_ast);
    setErrors(_errors);
  }, [query.esql]);

  useEffect(() => {
    parseQuery();
  }, [parseQuery]);

  const hasKeepClause = useMemo(() => {
    return ast.some((clause) => clause.name === 'keep');
  }, [ast]);

  const metaDataColumns = useMemo(() => {
    const fromClause = ast.find((clause) => clause.name === 'from');
    const metadataClause = fromClause?.args.find((arg) => 'name' in arg && arg.name === 'metadata');

    const metadataColumns =
      metadataClause?.args.map((arg) => ('name' in arg ? arg.name : '')) || [];

    return metadataColumns;
  }, [ast]);

  return {
    errors,
    hasKeepClause,
    metaDataColumns,
  };
}
