/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import Charts from '../../../shared/charts/TransactionCharts';
import { getUrlParams } from '../../../../store/urlParams';
import {
  getOverviewCharts,
  loadOverviewCharts
} from '../../../../store/overviewCharts';
import { getKey } from '../../../../store/apiHelpers';

function mapStateToProps(state = {}) {
  return {
    urlParams: getUrlParams(state),
    charts: getOverviewCharts(state)
  };
}

const mapDispatchToProps = dispatch => ({
  loadCharts: props => {
    const { serviceName, start, end, transactionType } = props.urlParams;
    const key = getKey({ serviceName, start, end, transactionType });

    if (key && props.charts.key !== key) {
      dispatch(
        loadOverviewCharts({ serviceName, start, end, transactionType })
      );
    }
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(Charts);
