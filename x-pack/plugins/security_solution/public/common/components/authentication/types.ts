/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticationsEdges } from '../../../../common/search_strategy';
import { UsersComponentsQueryProps } from '../../../users/pages/navigation/types';
import { Columns } from '../paginated_table';

export type AuthTableColumns = Array<Columns<AuthenticationsEdges>>;
export interface AuthenticationsUserTableProps extends UsersComponentsQueryProps {
  userName?: string;
}
