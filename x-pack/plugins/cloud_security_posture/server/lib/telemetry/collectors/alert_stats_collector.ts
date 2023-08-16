/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { CloudSecurityAlertsStats } from './types';
import { DETECTION_ENGINE_ALERTS_INDEX_DEFAULT } from '../../../../common/constants';

interface AlertsStats {
  aggregations: {
    cspm: {
      rules_count: {
        value: number;
      };
      alerts_open: {
        doc_count: number;
      };
      alerts_acknowledged: {
        doc_count: number;
      };
      alerts_closed: {
        doc_count: number;
      };
    };
    kspm: {
      rules_count: {
        value: number;
      };
      alerts_open: {
        doc_count: number;
      };
      alerts_acknowledged: {
        doc_count: number;
      };
      alerts_closed: {
        doc_count: number;
      };
    };
    vuln_mgmt: {
      rules_count: {
        value: number;
      };
      alerts_open: {
        doc_count: number;
      };
      alerts_acknowledged: {
        doc_count: number;
      };
      alerts_closed: {
        doc_count: number;
      };
    };
  };
}

const getAlertsStatsQuery = (index: string) => ({
  size: 0,
  query: {
    bool: {
      filter: [{ term: { 'kibana.alert.rule.tags': 'Cloud Security' } }],
    },
  },
  sort: '@timestamp:desc',
  index,
  aggs: {
    cspm: {
      filter: {
        term: {
          'kibana.alert.rule.tags': 'CSPM',
        },
      },
      aggs: {
        rules_count: {
          cardinality: {
            field: 'kibana.alert.rule.uuid',
          },
        },
        alerts_open: {
          filter: {
            term: {
              'kibana.alert.workflow_status': 'open',
            },
          },
        },
        alerts_acknowledged: {
          filter: {
            term: {
              'kibana.alert.workflow_status': 'acknowledged',
            },
          },
        },
        alerts_closed: {
          filter: {
            term: {
              'kibana.alert.workflow_status': 'closed',
            },
          },
        },
      },
    },
    kspm: {
      filter: {
        term: {
          'kibana.alert.rule.tags': 'KSPM',
        },
      },
      aggs: {
        rules_count: {
          cardinality: {
            field: 'kibana.alert.rule.uuid',
          },
        },
        alerts_open: {
          filter: {
            term: {
              'kibana.alert.workflow_status': 'open',
            },
          },
        },
        alerts_acknowledged: {
          filter: {
            term: {
              'kibana.alert.workflow_status': 'acknowledged',
            },
          },
        },
        alerts_closed: {
          filter: {
            term: {
              'kibana.alert.workflow_status': 'closed',
            },
          },
        },
      },
    },
    vuln_mgmt: {
      filter: {
        term: {
          'kibana.alert.rule.tags': 'CNVM',
        },
      },
      aggs: {
        rules_count: {
          cardinality: {
            field: 'kibana.alert.rule.uuid',
          },
        },
        alerts_open: {
          filter: {
            term: {
              'kibana.alert.workflow_status': 'open',
            },
          },
        },
        alerts_acknowledged: {
          filter: {
            term: {
              'kibana.alert.workflow_status': 'acknowledged',
            },
          },
        },
        alerts_closed: {
          filter: {
            term: {
              'kibana.alert.workflow_status': 'closed',
            },
          },
        },
      },
    },
  },
});

export const getAlertsStats = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<CloudSecurityAlertsStats[]> => {
  const index = DETECTION_ENGINE_ALERTS_INDEX_DEFAULT;

  try {
    const isIndexExists = await esClient.indices.exists({
      index,
    });

    if (isIndexExists) {
      const alertsStats = await esClient.search<unknown, AlertsStats>(getAlertsStatsQuery(index));

      const postureTypes = ['cspm', 'kspm', 'vuln_mgmt'] as const;

      return postureTypes.map((postureType) => ({
        posture_type: postureType,
        rules_count: alertsStats.aggregations?.aggregations[postureType].rules_count.value,
        alerts_count: alertsStats.aggregations?.aggregations[postureType].alerts_open.doc_count,
        alerts_open_count:
          alertsStats.aggregations?.aggregations[postureType].alerts_open.doc_count,
        alerts_acknowledged_count:
          alertsStats.aggregations?.aggregations[postureType].alerts_acknowledged.doc_count,
        alerts_closed_count:
          alertsStats.aggregations?.aggregations[postureType].alerts_closed.doc_count,
      })) as CloudSecurityAlertsStats[];
    }
    return [];
  } catch (e) {
    logger.error(`Failed to get index stats for ${index}: ${e}`);
    return [];
  }
};
