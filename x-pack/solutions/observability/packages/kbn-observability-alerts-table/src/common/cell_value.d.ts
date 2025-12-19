/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { Alert } from '@kbn/alerting-types';
import type { GetObservabilityAlertsTableProp } from '../types';
export declare const getAlertFieldValue: (alert: Alert, fieldName: string) => string;
export type AlertCellRenderers = Record<string, (value: string) => ReactNode>;
/**
 * This implementation of `EuiDataGrid`'s `renderCellValue`
 * accepts `EuiDataGridCellValueElementProps`, plus `data`
 * from the TGrid
 */
export declare const AlertsTableCellValue: GetObservabilityAlertsTableProp<'renderCellValue'>;
