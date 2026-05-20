import React from 'react';
import type { EmbeddableApmAlertingLatencyVizProps } from '../types';
export declare function APMAlertingLatencyChart({ rule, alert, serviceName, environment, transactionType, transactionName, rangeFrom, rangeTo, latencyThresholdInMicroseconds, kuery, filters, }: EmbeddableApmAlertingLatencyVizProps): React.JSX.Element;
