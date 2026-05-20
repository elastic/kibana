import type { ExitSpanDestination, ServiceMapSpan } from './types';
export declare const getPaths: ({ spans }: {
    spans: ServiceMapSpan[];
}) => {
    connections: import("@kbn/apm-types/src/service_map").Connection[];
    exitSpanDestinations: ExitSpanDestination[];
};
