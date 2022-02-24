/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypedLensByValueInput } from '../../../../../../lens/public';

export const addDataViewToLensAttributes = ({
  lensAttributes,
  dataViewId,
}: {
  lensAttributes: TypedLensByValueInput['attributes'];
  dataViewId: string;
}): TypedLensByValueInput['attributes'] => ({
  ...lensAttributes,
  references: lensAttributes.references.map((ref: { id: string; type: string; name: string }) => ({
    ...ref,
    id: dataViewId,
  })),
});
