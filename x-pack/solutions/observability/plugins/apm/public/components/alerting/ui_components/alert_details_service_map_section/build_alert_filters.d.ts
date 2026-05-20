import type { AlertDetailsAppSectionProps } from '../alert_details_app_section/types';
export interface AlertFilterBadge {
    label: string;
    field: string;
}
/**
 * KQL scoping the preview to the alerting context. Values are escaped via
 * `escapeQuotes` (handles backslashes + double-quotes).
 */
export declare function buildKueryFromAlert(alert: AlertDetailsAppSectionProps['alert']): string;
/** User-facing filter chips shown above the preview. Display only — no escaping. */
export declare function buildFiltersFromAlert(alert: AlertDetailsAppSectionProps['alert']): AlertFilterBadge[];
