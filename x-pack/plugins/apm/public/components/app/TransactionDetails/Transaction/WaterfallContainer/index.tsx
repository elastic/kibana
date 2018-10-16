/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React, { PureComponent } from 'react';
// @ts-ignore
import {
  SERVICE_NAME,
  TRACE_ID,
  TRANSACTION_ID
} from '../../../../../../common/constants';
import { Transaction } from '../../../../../../typings/Transaction';

import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { Span } from '../../../../../../typings/Span';
// @ts-ignore
import { loadSpans, loadTrace } from '../../../../../services/rest/apm';
import { getServiceColors } from './getServiceColors';
import { ServiceLegends } from './ServiceLegends';
import { Waterfall } from './Waterfall';
import { getWaterfall } from './Waterfall/waterfall_helpers/waterfall_helpers';

interface Props {
  urlParams: IUrlParams;
  transaction: Transaction;
  location: any;
}

interface State {
  services: string[];
  hits: Array<Span | Transaction>;
}

export class WaterfallContainer extends PureComponent<Props, State> {
  public state: Readonly<State> = {
    services: [],
    hits: []
  };

  public maybeFetchWaterfall = async (prevProps?: Props) => {
    const hasTrace = this.props.transaction.hasOwnProperty('trace');
    if (hasTrace) {
      this.maybeFetchTrace(prevProps);
    } else {
      this.maybeFetchSpans(prevProps);
    }
  };

  public maybeFetchSpans = async (prevProps = {} as Partial<Props>) => {
    const { start, end } = this.props.urlParams;
    const { start: prevStart, end: prevEnd } =
      prevProps.urlParams || ({} as IUrlParams);

    const serviceName: string = get(this.props.transaction, SERVICE_NAME);
    const prevServiceName: string = get(prevProps.transaction, SERVICE_NAME);

    const transactionId: string = get(this.props.transaction, TRANSACTION_ID);
    const prevTransactionId: string = get(
      prevProps.transaction,
      TRANSACTION_ID
    );

    if (
      serviceName !== prevServiceName ||
      transactionId !== prevTransactionId ||
      start !== prevStart ||
      end !== prevEnd
    ) {
      const spans = await loadSpans({
        serviceName,
        transactionId,
        start,
        end
      });

      this.setState({
        hits: [this.props.transaction, ...spans],
        services: [serviceName]
      });
    }
  };

  public maybeFetchTrace = async (prevProps = {} as Partial<Props>) => {
    const { start, end } = this.props.urlParams;
    const { start: prevStart, end: prevEnd } =
      prevProps.urlParams || ({} as IUrlParams);

    const traceId = get(this.props, `transaction.${TRACE_ID}`);
    const prevTraceId: string = get(prevProps, `transaction.${TRACE_ID}`);

    if (
      traceId &&
      start &&
      end &&
      (traceId !== prevTraceId || start !== prevStart || end !== prevEnd)
    ) {
      const { hits, services } = await loadTrace({ traceId, start, end });
      this.setState({ hits, services });
    }
  };

  public componentDidMount() {
    this.maybeFetchWaterfall();
  }

  public async componentDidUpdate(prevProps: Props) {
    this.maybeFetchWaterfall(prevProps);
  }

  public render() {
    const { location, urlParams, transaction } = this.props;
    const { hits, services } = this.state;
    const waterfall = getWaterfall(hits, services, transaction);

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
