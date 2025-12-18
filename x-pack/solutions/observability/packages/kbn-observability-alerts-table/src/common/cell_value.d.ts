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
