import type { ServiceMapNode } from '../../../../common/service_map';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
export type ServiceMapBadgesApiResponse = APIReturnType<'POST /internal/apm/service-map/service_badges'>;
/**
 * Merges `POST /internal/apm/service-map/service_badges` into service nodes so
 * {@link ServiceNode} can render alert / SLO badges.
 */
export declare function mergeServiceMapNodesWithBadges(nodes: ServiceMapNode[], badges: ServiceMapBadgesApiResponse): ServiceMapNode[];
