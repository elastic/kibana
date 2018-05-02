/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import Charts from '../../../shared/charts/TransactionCharts';
import { getUrlParams } from '../../../../store/urlParams';
import {
  getDetailsCharts,
  loadDetailsCharts
} from '../../../../store/detailsCharts';
import { getKey } from '../../../../store/apiHelpers';

function mapStateToProps(state = {}) {
  return {
    urlParams: getUrlParams(state),
    charts: getDetailsCharts(state)
  };
}

const mapDispatchToProps = dispatch => ({
  loadCharts: props => {
    const {
      serviceName,
      start,
      end,
      transactionType,
      transactionName
    } = props.urlParams;
    const key = getKey({
      serviceName,
      start,
      end,
      transactionType,
      transactionName
    });

    if (key && props.charts.key !== key) {
      dispatch(
        loadDetailsCharts({
          serviceName,
          start,
          end,
          transactionType,
          transactionName
        })
      );
    }
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(Charts);
