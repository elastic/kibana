export interface ServiceMapTimeRange {
    from: string;
    to: string;
}
export interface AlertServiceMapTimeRanges {
    /** Graph window: `[alertStart − 5m, min(alertEnd ?? now, alertStart + 30m)]`. */
    graph: ServiceMapTimeRange;
    /** Badges window: `[alertStart − 5m, alertEnd ?? now]` — full alert lifecycle. */
    badges: ServiceMapTimeRange;
}
/** Computes graph + badges time ranges for the alert details preview. `nowMs` is injectable for tests. */
export declare function getServiceMapTimeRange(alertStart: string, alertEnd?: string, nowMs?: number): AlertServiceMapTimeRanges;
