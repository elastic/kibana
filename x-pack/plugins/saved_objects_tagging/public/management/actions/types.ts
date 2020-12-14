/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action as EuiTableAction } from '@elastic/eui/src/components/basic_table/action_types';
import { TagWithRelations } from '../../../common';

export type TagAction = EuiTableAction<TagWithRelations> & {
  id: string;
};
