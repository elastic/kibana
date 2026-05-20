interface HandledPromises<T> {
    fulfilled: T[];
    rejected: unknown[];
}
export declare const splitAllSettledPromises: <T = unknown>(promises: Array<PromiseSettledResult<T>>) => HandledPromises<T>;
export {};
