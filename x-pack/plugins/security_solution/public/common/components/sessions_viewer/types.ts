/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Filter } from '@kbn/es-query';
import type { EntityType } from '@kbn/timelines-plugin/common';
import type { TableIdLiteral } from '../../../../common/types';
import type { QueryTabBodyProps } from '../../../explore/hosts/pages/navigation/types';
import type { ColumnHeaderOptions } from '../../../../common/types/timeline';

export interface SessionsComponentsProps extends Pick<QueryTabBodyProps, 'endDate' | 'startDate'> {
  tableId: TableIdLiteral;
  pageFilters: Filter[];
  defaultFilters?: Filter[];
  entityType?: EntityType;
  filterQuery?: string;
  columns?: ColumnHeaderOptions[];
  defaultColumns?: ColumnHeaderOptions[];
}
