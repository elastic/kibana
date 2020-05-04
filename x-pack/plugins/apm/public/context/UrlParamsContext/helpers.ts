/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compact, pick } from 'lodash';
import datemath from '@elastic/datemath';
import { IUrlParams } from './types';
import { ProcessorEvent } from '../../../common/processor_event';

interface PathParams {
  processorEvent?: ProcessorEvent;
  serviceName?: string;
  errorGroupId?: string;
  serviceNodeName?: string;
  traceId?: string;
}

export function getParsedDate(rawDate?: string, opts = {}) {
  if (rawDate) {
    const parsed = datemath.parse(rawDate, opts);
    if (parsed) {
      return parsed.toISOString();
    }
  }
}

export function getStart(prevState: IUrlParams, rangeFrom?: string) {
  if (prevState.rangeFrom !== rangeFrom) {
    return getParsedDate(rangeFrom);
  }
  return prevState.start;
}

export function getEnd(prevState: IUrlParams, rangeTo?: string) {
  if (prevState.rangeTo !== rangeTo) {
    return getParsedDate(rangeTo, { roundUp: true });
  }
  return prevState.end;
}

export function toNumber(value?: string) {
  if (value !== undefined) {
    return parseInt(value, 10);
  }
}

export function toString(value?: string) {
  if (value === '' || value === 'null' || value === 'undefined') {
    return;
  }
  return value;
}

export function toBoolean(value?: string) {
  return value === 'true';
}

export function getPathAsArray(pathname: string = '') {
  return compact(pathname.split('/'));
}

export function removeUndefinedProps<T>(obj: T): Partial<T> {
  return pick(obj, value => value !== undefined);
}

export function getPathParams(pathname: string = ''): PathParams {
  const paths = getPathAsArray(pathname);
  const pageName = paths[0];
  // TODO: use react router's real match params instead of guessing the path order

  switch (pageName) {
    case 'services':
      let servicePageName = paths[2];
      const serviceName = paths[1];
      const serviceNodeName = paths[3];

      if (servicePageName === 'nodes' && paths.length > 3) {
        servicePageName = 'metrics';
      }

      switch (servicePageName) {
        case 'transactions':
          return {
            processorEvent: ProcessorEvent.transaction,
            serviceName
          };
        case 'errors':
          return {
            processorEvent: ProcessorEvent.error,
            serviceName,
            errorGroupId: paths[3]
          };
        case 'metrics':
          return {
            processorEvent: ProcessorEvent.metric,
            serviceName,
            serviceNodeName
          };
        case 'nodes':
          return {
            processorEvent: ProcessorEvent.metric,
            serviceName
          };
        case 'service-map':
          return {
            serviceName
          };
        default:
          return {};
      }

    case 'traces':
      return {
        processorEvent: ProcessorEvent.transaction
      };
    case 'link-to':
      const link = paths[1];
      switch (link) {
        case 'trace':
          return {
            traceId: paths[2]
          };
        default:
          return {};
      }
    default:
      return {};
  }
}
