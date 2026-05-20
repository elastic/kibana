export interface TimeRange {
    from: string;
    to: string;
}
export declare const getPaddedAlertTimeRange: (alertStart: string, alertEnd?: string, lookBackWindow?: {
    size: number;
    unit: "s" | "m" | "h" | "d";
}) => TimeRange;
