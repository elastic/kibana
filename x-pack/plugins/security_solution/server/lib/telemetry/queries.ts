import { ElasticsearchClient, Logger } from 'src/core/server';
import { SearchRequest } from '@elastic/elasticsearch/api/types';
import { TelemetryEvent, ESLicense, ESClusterInfo} from './types'
import { AgentService } from '../../../../fleet/server';



export class TelemetryQuerier {
  private readonly logger: Logger; 
  private esClient?: ElasticsearchClient;
  private agentService?: AgentService;
  private readonly max_records = 10_000;
  private maxQueueSize = 100;

  constructor(esClient?: ElasticsearchClient, agentService?: AgentService) {
	  this.agentService = agentService;
	  this.esClient = esClient;
  }

/**
 * Get the cluster info from the connected cluster.
 * Copied from:
 * src/plugins/telemetry/server/telemetry_collection/get_cluster_info.ts
 * This is the equivalent to GET /
 *
 * @param {function} esClient The asInternalUser handler (exposed for testing)
 */
private async getClusterInfo(esClient: ElasticsearchClient) {
	const { body } = await esClient.info();
	return body;
      }

public async fetchFleetAgents() {
	if (this.esClient === undefined || this.esClient === null) {
	  throw Error('could not fetch policy responses. es client is not available');
	}
    
	return this.agentService?.listAgents(this.esClient, {
	  perPage: this.max_records,
	  showInactive: true,
	  sortField: 'enrolled_at',
	  sortOrder: 'desc',
	});
      }
    
private async fetchClusterInfo(): Promise<ESClusterInfo> {
	if (this.esClient === undefined) {
	  throw Error("Couldn't fetch cluster info. es client is not available");
	}
	return this.getClusterInfo(this.esClient);
      }
    

public async fetchEndpointPolicyResponses(executeFrom: string, executeTo: string) {
	if (this.esClient === undefined || this.esClient === null) {
	  throw Error('could not fetch policy responses. es client is not available');
	}
    
	const query: SearchRequest = {
	  expand_wildcards: 'open,hidden',
	  index: `.ds-metrics-endpoint.policy*`,
	  ignore_unavailable: false,
	  size: 0, // no query results required - only aggregation quantity
	  body: {
	    query: {
	      range: {
		'@timestamp': {
		  gte: executeFrom,
		  lt: executeTo,
		},
	      },
	    },
	    aggs: {
	      policy_responses: {
		terms: {
		  size: this.max_records,
		  field: 'Endpoint.policy.applied.id',
		},
		aggs: {
		  latest_response: {
		    top_hits: {
		      size: 1,
		      sort: [
			{
			  '@timestamp': {
			    order: 'desc',
			  },
			},
		      ],
		    },
		  },
		},
	      },
	    },
	  },
	};
    
	return this.esClient.search(query);
      }



      public async fetchEndpointMetrics(executeFrom: string, executeTo: string) {
	if (this.esClient === undefined || this.esClient === null) {
	  throw Error('could not fetch policy responses. es client is not available');
	}
    
	const query: SearchRequest = {
	  expand_wildcards: 'open,hidden',
	  index: `.ds-metrics-endpoint.metrics-*`,
	  ignore_unavailable: false,
	  size: 0, // no query results required - only aggregation quantity
	  body: {
	    query: {
	      range: {
		'@timestamp': {
		  gte: executeFrom,
		  lt: executeTo,
		},
	      },
	    },
	    aggs: {
	      endpoint_agents: {
		terms: {
		  field: 'agent.id',
		  size: this.max_records,
		},
		aggs: {
		  latest_metrics: {
		    top_hits: {
		      size: 1,
		      sort: [
			{
			  '@timestamp': {
			    order: 'desc',
			  },
			},
		      ],
		    },
		  },
		},
	      },
	    },
	  },
	};
    
	return this.esClient.search(query);
      }

      public async fetchDiagnosticAlerts(executeFrom: string, executeTo: string) {
	const query = {
	  expand_wildcards: 'open,hidden',
	  index: '.logs-endpoint.diagnostic.collection-*',
	  ignore_unavailable: true,
	  size: this.maxQueueSize,
	  body: {
	    query: {
	      range: {
		'event.ingested': {
		  gte: executeFrom,
		  lt: executeTo,
		},
	      },
	    },
	    sort: [
	      {
		'event.ingested': {
		  order: 'desc' as const,
		},
	      },
	    ],
	  },
	};
    
	if (this.esClient === undefined) {
	  throw Error('could not fetch diagnostic alerts. es client is not available');
	}
    
	return (await this.esClient.search<TelemetryEvent>(query)).body;
      }


      private async getLicense(
	esClient: ElasticsearchClient,
	local: boolean
      ): Promise<{ license: ESLicense }> {
	return (
	  await esClient.transport.request({
	    method: 'GET',
	    path: '/_license',
	    querystring: {
	      local,
	      // For versions >= 7.6 and < 8.0, this flag is needed otherwise 'platinum' is returned for 'enterprise' license.
	      accept_enterprise: 'true',
	    },
	  })
	).body as Promise<{ license: ESLicense }>; // Note: We have to as cast since transport.request doesn't have generics
      }

      private async fetchLicenseInfo(): Promise<ESLicense | undefined> {
	if (!this.esClient) {
	  return undefined;
	}
	try {
	  const ret = await this.getLicense(this.esClient, true);
	  return ret.license;
	} catch (err) {
	  this.logger.warn(`Error retrieving license: ${err}`);
	  return undefined;
	}
      }
    
      private copyLicenseFields(lic: ESLicense) {
	return {
	  uid: lic.uid,
	  status: lic.status,
	  type: lic.type,
	  ...(lic.issued_to ? { issued_to: lic.issued_to } : {}),
	  ...(lic.issuer ? { issuer: lic.issuer } : {}),
	};
      }
}