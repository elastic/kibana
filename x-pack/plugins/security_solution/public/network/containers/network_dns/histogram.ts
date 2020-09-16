/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { DocumentNode } from 'graphql';
import { ScaleType } from '@elastic/charts';

import { MatrixHistogram } from '../../../common/components/matrix_histogram';
import {
  MatrixHistogramOption,
  GetSubTitle,
} from '../../../common/components/matrix_histogram/types';
import { UpdateDateRange } from '../../../common/components/charts/common';
import { GlobalTimeArgs } from '../../../common/containers/use_global_time';
import { withKibana } from '../../../common/lib/kibana';
import { QueryTemplatePaginatedProps } from '../../../common/containers/query_template_paginated';
import { DEFAULT_TABLE_ACTIVE_PAGE, DEFAULT_TABLE_LIMIT } from '../../../common/store/constants';
import { networkModel, networkSelectors } from '../../store';
import { State, inputsSelectors } from '../../../common/store';

export const HISTOGRAM_ID = 'networkDnsHistogramQuery';

interface DnsHistogramOwnProps extends QueryTemplatePaginatedProps {
  dataKey: string | string[];
  defaultStackByOption: MatrixHistogramOption;
  errorMessage: string;
  isDnsHistogram?: boolean;
  query: DocumentNode;
  scaleType: ScaleType;
  setQuery: GlobalTimeArgs['setQuery'];
  showLegend?: boolean;
  stackByOptions: MatrixHistogramOption[];
  subtitle?: string | GetSubTitle;
  title: string;
  type: networkModel.NetworkType;
  updateDateRange: UpdateDateRange;
  yTickFormatter?: (value: number) => string;
}

const makeMapHistogramStateToProps = () => {
  const getNetworkDnsSelector = networkSelectors.dnsSelector();
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { id = HISTOGRAM_ID }: DnsHistogramOwnProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      ...getNetworkDnsSelector(state),
      activePage: DEFAULT_TABLE_ACTIVE_PAGE,
      limit: DEFAULT_TABLE_LIMIT,
      isInspected,
      id,
    };
  };

  return mapStateToProps;
};

export const NetworkDnsHistogramQuery = compose<React.ComponentClass<DnsHistogramOwnProps>>(
  connect(makeMapHistogramStateToProps),
  withKibana
)(MatrixHistogram);
