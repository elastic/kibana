/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

const deleteInvestigationParamsSchema = t.type({
  path: t.type({
    id: t.string,
  }),
});

type DeleteInvestigationParams = t.TypeOf<typeof deleteInvestigationParamsSchema.props.path>; // Parsed payload used by the backend

export { deleteInvestigationParamsSchema };
export type { DeleteInvestigationParams };
