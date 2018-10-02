/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React, { PureComponent } from 'react';
// @ts-ignore
import { TRACE_ID } from '../../../../../../common/constants';
import { Transaction } from '../../../../../../typings/Transaction';

import { Span } from '../../../../../../typings/Span';
// @ts-ignore
import { loadTrace } from '../../../../../services/rest/apm';
import { getServiceColors } from './getServiceColors';
import { ServiceLegends } from './ServiceLegends';
import { IUrlParams, Waterfall } from './Waterfall';
import { getWaterfall } from './Waterfall/waterfall_helpers/waterfall_helpers';

interface Props {
  urlParams: IUrlParams;
  transaction: Transaction;
  location: any;
}

interface State {
  // TODO: reuse typings from get_trace.js
  trace: {
    services: string[];
    hits: Array<Span | Transaction>;
  } | null;
}

export class WaterfallContainer extends PureComponent<Props, State> {
  public state: Readonly<State> = {
    trace: null
  };

  public maybeFetchTrace = async (prevProps?: Props) => {
    const { start, end } = this.props.urlParams;
    const traceId = get(this.props, `transaction.${TRACE_ID}`);
    const prevTraceId: string = get(prevProps, `transaction.${TRACE_ID}`);
    const prevUrlParams: IUrlParams = get(prevProps, 'urlParams') || {};

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

  public componentDidMount() {
    this.maybeFetchTrace();
  }

  public async componentDidUpdate(prevProps: Props) {
    this.maybeFetchTrace(prevProps);
  }

  public render() {
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
