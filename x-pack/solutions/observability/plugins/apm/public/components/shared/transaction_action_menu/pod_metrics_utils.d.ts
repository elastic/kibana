import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import type { AssetDetailsLocator } from '@kbn/observability-shared-plugin/common';
interface PodMetricsLinkParams {
    podId: string | null | undefined;
    agentName: string | undefined;
    infraMetricsQuery: {
        from: string;
        to: string;
    } | undefined;
    assetDetailsLocator?: AssetDetailsLocator;
    discoverLocator?: LocatorPublic<SerializableRecord>;
    infraLinksAvailable?: boolean;
    metricsIndices?: string;
}
/**
 * Determines the appropriate pod metrics link based on whether the pod is
 * OTel-observed and running on K8s. For OTel-observed K8s pods, returns a
 * Discover link instead of Infra UI link (since Infra UI doesn't support OTel pods).
 */
export declare function getPodMetricsLink({ podId, agentName, infraMetricsQuery, assetDetailsLocator, discoverLocator, infraLinksAvailable, metricsIndices, }: PodMetricsLinkParams): string | undefined;
export {};
