import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { EmbeddablePublicDefinition } from '@kbn/embeddable-plugin/public';
import type { HasEditCapabilities, PublishesBlockingError, PublishesUnifiedSearch } from '@kbn/presentation-publishing';
import type { TimeRange } from '@kbn/es-query';
import type { ServiceMapEmbeddableState } from '../../../server/lib/embeddables/service_map_embeddable_schema';
import type { EmbeddableDeps } from '../types';
export type ServiceMapEmbeddableApi = DefaultEmbeddableApi<ServiceMapEmbeddableState> & HasEditCapabilities & PublishesBlockingError & PublishesUnifiedSearch & {
    setTimeRange: (timeRange: TimeRange | undefined) => void;
    canEditUnifiedSearch: () => boolean;
};
export declare const getServiceMapEmbeddableFactory: (deps: EmbeddableDeps) => EmbeddablePublicDefinition<Readonly<{
    title?: string | undefined;
    description?: string | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    kuery?: string | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    service_name?: string | undefined;
    service_group_id?: string | undefined;
} & {
    environment: string;
}>, ServiceMapEmbeddableApi>;
