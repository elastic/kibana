/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Query, Ast } from '@elastic/eui';

export { Query };
export type Clause = Parameters<typeof Query['isMust']>[0];

type ExtractClauseType<T> = T extends (x: any) => x is infer Type ? Type : never;
export type TermClause = ExtractClauseType<typeof Ast['Term']['isInstance']>;
export type FieldClause = ExtractClauseType<typeof Ast['Field']['isInstance']>;
export type Value = Parameters<typeof Ast['Term']['must']>[0];

export type ItemIdToExpandedRowMap = Record<string, JSX.Element>;
