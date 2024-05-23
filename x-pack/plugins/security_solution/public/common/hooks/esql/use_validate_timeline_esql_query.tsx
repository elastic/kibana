/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregateQuery } from '@kbn/es-query';
import type { EditorError, ESQLAst, ESQLCommandOption } from '@kbn/esql-ast';
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import { useCallback, useEffect, useMemo, useState } from 'react';
interface UseValidateSecuritySolutionESQLQueryArgs {
  query: AggregateQuery;
}

export function getESQLSourceCommand(ast: ESQLAst) {
  const commandClause = ast.find((clause) => clause.type === 'command');
  return commandClause && 'name' in commandClause ? commandClause.name : undefined;
}

export function getESQLHasKeepClause(ast: ESQLAst) {
  return ast.some((clause) => clause.name === 'keep');
}

export function getESQLMetaDataColumns(ast: ESQLAst) {
  const fromClause = ast.find((clause) => clause.name === 'from');
  const metadataClause = fromClause?.args.find((arg) => 'name' in arg && arg.name === 'metadata');
  const metadataColumns =
    (metadataClause as ESQLCommandOption | undefined)?.args.map((arg) =>
      'name' in arg ? arg.name : ''
    ) || [];
  return metadataColumns;
}

export function parseESQLQuery(query: AggregateQuery) {
  const { ast: _ast, errors: _errors } = getAstAndSyntaxErrors(query.esql);
  return {
    ast: _ast,
    errors: _errors,
  };
}

export function useValidateSecuritySolutionESQLQuery({
  query,
}: UseValidateSecuritySolutionESQLQueryArgs) {
  const [errors, setErrors] = useState<EditorError[]>([]);

  const [ast, setAst] = useState<ESQLAst>(parseESQLQuery(query).ast);

  const parseQuery = useCallback(() => {
    const { ast: _ast, errors: _errors } = parseESQLQuery(query);
    setAst(_ast);
    setErrors(_errors);
  }, [query]);

  useEffect(() => {
    parseQuery();
  }, [parseQuery]);

  const validationResult = useMemo(() => {
    return {
      errors,
      hasKeepClause: getESQLHasKeepClause(ast),
      metaDataColumns: getESQLMetaDataColumns(ast),
      command: getESQLSourceCommand(ast),
    };
  }, [ast, errors]);

  return validationResult;
}
