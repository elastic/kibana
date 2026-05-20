import type { ServiceMapNode, ServiceMapEdge } from '../../../../../common/service_map';
export type ServiceMapSelection = ServiceMapNode | ServiceMapEdge;
export declare function isEdge(selection: ServiceMapSelection): selection is ServiceMapEdge;
