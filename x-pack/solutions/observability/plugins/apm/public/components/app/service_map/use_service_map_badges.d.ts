import type { ServiceMapNode } from '../../../../common/service_map';
import type { Environment } from '../../../../common/environment_rt';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
interface ServiceMapBadgesReturn {
    nodes: ServiceMapNode[];
    status: FETCH_STATUS;
}
/** Fetches per-service alert counts and SLO stats for every service node in one POST. */
export declare function useServiceMapBadges({ environment, start, end, kuery, nodes, nodesStatus, }: {
    environment: Environment;
    start: string;
    end: string;
    kuery: string;
    nodes: ServiceMapNode[];
    nodesStatus: FETCH_STATUS;
}): ServiceMapBadgesReturn;
export {};
