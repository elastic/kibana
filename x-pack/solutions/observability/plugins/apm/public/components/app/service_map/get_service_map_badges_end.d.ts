/**
 * Returns `end`, bumped to "now" when it's in the past, so the badges query
 * always covers currently-active alerts. `nowMs` is injectable for tests.
 */
export declare function getServiceMapBadgesEnd(end: string, nowMs?: number): string;
