/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinitionWithState } from '@kbn/entities-schema';
import { EuiStatProps } from '@elastic/eui';

export interface DefinitionStatProps {
  definition: EntityDefinitionWithState;
  titleSize?: EuiStatProps['titleSize'];
  textAlign?: EuiStatProps['textAlign'];
}
