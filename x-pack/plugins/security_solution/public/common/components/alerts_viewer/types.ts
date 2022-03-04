/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import type { EntityType } from '../../../../../timelines/common';
import { TimelineIdLiteral } from '../../../../common/types/timeline';
import { HostsComponentsQueryProps } from '../../../hosts/pages/navigation/types';
import { NetworkComponentQueryProps } from '../../../network/pages/navigation/types';
import { MatrixHistogramOption } from '../matrix_histogram/types';

type CommonQueryProps = HostsComponentsQueryProps | NetworkComponentQueryProps;

export interface AlertsComponentsProps
  extends Pick<
    CommonQueryProps,
    'deleteQuery' | 'endDate' | 'filterQuery' | 'skip' | 'setQuery' | 'startDate'
  > {
  timelineId: TimelineIdLiteral;
  pageFilters: Filter[];
  stackByOptions?: MatrixHistogramOption[];
  defaultFilters?: Filter[];
  defaultStackByOption?: MatrixHistogramOption;
  entityType?: EntityType;
  indexNames: string[];
}
