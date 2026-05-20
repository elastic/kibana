import type { TIME_UNITS } from '@kbn/triggers-actions-ui-plugin/public';
import type { RuleTypeMetaData } from '@kbn/alerting-plugin/common';
export interface AlertMetadata extends RuleTypeMetaData {
    environment: string;
    serviceName?: string;
    transactionType?: string;
    start?: string;
    end?: string;
}
export declare const ALERT_PREVIEW_BUCKET_SIZE = 5;
export declare function getIntervalAndTimeRange({ windowSize, windowUnit, }: {
    windowSize: number;
    windowUnit: TIME_UNITS;
}): {
    interval: string;
    start: string;
    end: string;
};
