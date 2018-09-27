/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import Waterfall from './Waterfall';
import { getServiceColors } from './getServiceColors';
import ServiceLegends from './ServiceLegends';
import { loadTrace } from '../../../../../services/rest/apm';
import { TRACE_ID } from '../../../../../../common/constants';
import { getWaterfall } from './Waterfall/waterfall_helpers/waterfall_helpers';

export class WaterfallContainer extends PureComponent {
  state = {
    trace: null
  };

  maybeFetchTrace = async prevProps => {
    const { start, end } = this.props.urlParams;
    const traceId = get(this.props, `transaction.${TRACE_ID}`);
    const prevTraceId = get(prevProps, `transaction.${TRACE_ID}`);
    const prevUrlParams = get(prevProps, 'urlParams', {});

    if (
      traceId &&
      start &&
      end &&
      (traceId !== prevTraceId ||
        start !== prevUrlParams.start ||
        end !== prevUrlParams.end)
    ) {
      const trace = await loadTrace({ traceId, start, end });
      this.setState({ trace });
    }
  };

  componentDidMount() {
    this.maybeFetchTrace();
  }

  async componentDidUpdate(prevProps) {
    this.maybeFetchTrace(prevProps);
  }

  render() {
    const { location, urlParams, transaction } = this.props;
    const { trace } = this.state;

    if (!trace) {
      return null;
    }

    const waterfall = getWaterfall(trace.hits, trace.services, transaction);
    if (!waterfall) {
      return null;
    }
    const serviceColors = getServiceColors(waterfall.services);

    return (
      <div>
        <ServiceLegends serviceColors={serviceColors} />
        <Waterfall
          location={location}
          serviceColors={serviceColors}
          urlParams={urlParams}
          waterfall={waterfall}
        />
      </div>
    );
  }
}

WaterfallContainer.propTypes = {
  location: PropTypes.object.isRequired,
  transaction: PropTypes.object,
  urlParams: PropTypes.object.isRequired
};
