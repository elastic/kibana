import { ElasticsearchResponseHit } from '../../../common/types/es';

export interface KibanaInfo {
  transport_address?: string;
  name?: string;
  index?: string;
  host?: string;
  uuid?: string;
  status?: string;
  snapshot?: boolean;
  version?: string;
}

export const buildKibanaInfo = (hit: ElasticsearchResponseHit): KibanaInfo => {
  const source = hit._source;
  if (source.kibana_stats) return source.kibana_stats.kibana as KibanaInfo;

  return {
    name: source.kibana?.stats?.name,
    host: source.kibana?.stats?.host?.name,
    status: source.kibana?.stats?.status,
    transport_address: source.kibana?.stats?.transport_address,
    uuid: source.service?.id,
    snapshot: source.kibana?.stats?.snapshot,
    index: source.kibana?.stats?.index,
    version: source.service?.version,
  };
};
