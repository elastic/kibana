/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESTermQuery } from '../../../../../common/typed_json';
import { NarrowDateRange } from '../../../components/ml/types';
import { UpdateDateRange } from '../../../components/charts/common';
import { GlobalTimeArgs } from '../../use_global_time';
import { FlowTarget } from '../../../../graphql/types';
import { HostsType } from '../../../../hosts/store/model';
import { NetworkType } from '../../../../network/store//model';

interface QueryTabBodyProps {
  type: HostsType | NetworkType;
  filterQuery?: string | ESTermQuery;
}

export type AnomaliesQueryTabBodyProps = QueryTabBodyProps & {
  anomaliesFilterQuery?: object;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AnomaliesTableComponent: React.NamedExoticComponent<any>;
  deleteQuery?: ({ id }: { id: string }) => void;
  endDate: GlobalTimeArgs['to'];
  flowTarget?: FlowTarget;
  narrowDateRange: NarrowDateRange;
  setQuery: GlobalTimeArgs['setQuery'];
  startDate: GlobalTimeArgs['from'];
  skip: boolean;
  updateDateRange?: UpdateDateRange;
  hideHistogramIfEmpty?: boolean;
  ip?: string;
};
