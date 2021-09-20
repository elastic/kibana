/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation } from 'react-router-dom';
import {
  ProcessorEvent,
  UIProcessorEvent,
} from '../../../../common/processor_event';

/**
 * Infer the processor.event to used based on the route path
 */
export function useProcessorEvent(): UIProcessorEvent | undefined {
  const { pathname } = useLocation();
  const paths = pathname.split('/').slice(1);
  const pageName = paths[0];

  switch (pageName) {
    case 'services':
      let servicePageName = paths[2];

      if (servicePageName === 'nodes' && paths.length > 3) {
        servicePageName = 'metrics';
      }

      switch (servicePageName) {
        case 'transactions':
          return ProcessorEvent.transaction;
        case 'errors':
          return ProcessorEvent.error;
        case 'metrics':
          return ProcessorEvent.metric;
        case 'nodes':
          return ProcessorEvent.metric;

        default:
          return undefined;
      }
    case 'traces':
      return ProcessorEvent.transaction;
    default:
      return undefined;
  }
}
