/**
 * Base interface that any item must implement to be used in critical path calculations.
 *
 * This is intentionally a minimal interface to keep getCriticalPath() generic and reusable.
 */
export interface CriticalPathBase {
    id: string;
    offset: number;
    duration: number;
    skew: number;
}
export interface CriticalPathSegment<T extends CriticalPathBase> {
    item: T;
    offset: number;
    duration: number;
    self: boolean;
}
export interface CriticalPath<T extends CriticalPathBase> {
    segments: CriticalPathSegment<T>[];
}
