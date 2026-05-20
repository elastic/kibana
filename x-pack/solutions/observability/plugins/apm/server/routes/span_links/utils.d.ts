import type { OtelSpanLink, SpanLink } from '@kbn/apm-types';
export declare function getBufferedTimerange({ start, end, bufferSize, }: {
    start: number;
    end: number;
    bufferSize?: number;
}): {
    startWithBuffer: number;
    endWithBuffer: number;
};
export declare function mapOtelToSpanLink(otelSpanLinks?: Partial<OtelSpanLink> | undefined): SpanLink[];
