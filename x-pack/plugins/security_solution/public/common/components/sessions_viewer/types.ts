/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Filter } from '@kbn/es-query';
import type { EntityType } from '../../../../../timelines/common';
import { QueryTabBodyProps } from '../../../hosts/pages/navigation/types';
import { TimelineIdLiteral } from '../../../../common/types/timeline';

export interface SessionsComponentsProps extends Pick<QueryTabBodyProps, 'endDate' | 'startDate'> {
  timelineId: TimelineIdLiteral;
  pageFilters: Filter[];
  defaultFilters?: Filter[];
  entityType?: EntityType;
  filterQuery?: string;
}
