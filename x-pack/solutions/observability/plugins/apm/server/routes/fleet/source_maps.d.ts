import type { CoreStart, ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { Artifact } from '@kbn/fleet-plugin/server';
import type { SourceMap } from '../source_maps/route';
import type { APMPluginStartDependencies } from '../../types';
interface ApmSourceMapArtifactBody {
    serviceName: string;
    serviceVersion: string;
    bundleFilepath: string;
    sourceMap: SourceMap;
}
export type ArtifactSourceMap = Omit<Artifact, 'body'> & {
    body: ApmSourceMapArtifactBody;
};
export type FleetPluginStart = NonNullable<APMPluginStartDependencies['fleet']>;
export declare function getUnzippedArtifactBody(artifactBody: string): Promise<ApmSourceMapArtifactBody>;
export declare function getApmArtifactClient(fleetPluginStart: FleetPluginStart): import("@kbn/fleet-plugin/server").ArtifactsClientInterface;
export interface ListSourceMapArtifactsResponse {
    artifacts: Array<{
        body: ApmSourceMapArtifactBody;
        id: string;
        created: string;
        compressionAlgorithm: 'none' | 'zlib';
        encryptionAlgorithm: 'none';
        decodedSha256: string;
        decodedSize: number;
        encodedSha256: string;
        encodedSize: number;
        identifier: string;
        packageName: string;
        relative_url: string;
        type?: string | undefined;
    }>;
    total: number;
}
export declare function listSourceMapArtifacts({ fleetPluginStart, perPage, page, }: {
    fleetPluginStart: FleetPluginStart;
    perPage?: number;
    page?: number;
}): Promise<ListSourceMapArtifactsResponse>;
export declare function createFleetSourceMapArtifact({ apmArtifactBody, fleetPluginStart, }: {
    apmArtifactBody: ApmSourceMapArtifactBody;
    fleetPluginStart: FleetPluginStart;
}): Promise<Artifact>;
export declare function deleteFleetSourcemapArtifact({ id, fleetPluginStart, }: {
    id: string;
    fleetPluginStart: FleetPluginStart;
}): Promise<void>;
export declare function updateSourceMapsOnFleetPolicies({ coreStart, fleetPluginStart, savedObjectsClient, internalESClient, }: {
    coreStart: CoreStart;
    fleetPluginStart: FleetPluginStart;
    savedObjectsClient: SavedObjectsClientContract;
    internalESClient: ElasticsearchClient;
}): Promise<void[]>;
export declare function getCleanedBundleFilePath(bundleFilepath: string): string;
export {};
