import type { TimestampUs } from '@kbn/apm-types';
interface DocumentWithTimestampUs {
    timestamp: TimestampUs;
}
/**
 * Safely extracts `timestamp.us` from an APM document,
 * returning 0 when the field is missing or not a valid number.
 */
export declare const getTimestampUs: (document?: DocumentWithTimestampUs) => number;
export {};
