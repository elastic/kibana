/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceQuery } from '../../../../graphql/types';
import { InventoryItemType } from '../../../../../common/inventory_models/types';
import { findInventoryFields } from '../../../../../common/inventory_models';

export const getFieldByNodeType = (nodeType: InventoryItemType, source?: SourceQuery.Source) => {
  const fields = findInventoryFields(nodeType, source?.configuration.fields);
  return fields.id;
};
