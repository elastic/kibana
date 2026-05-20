import type { ServiceMapSpan } from '../../../../common/service_map';
/**
 * Drops spans whose source or destination service env doesn't match. Spans with
 * no env (legacy docs, dependency destinations) are kept.
 */
export declare function filterServiceMapSpansByEnvironment(spans: ServiceMapSpan[], environment: string): ServiceMapSpan[];
