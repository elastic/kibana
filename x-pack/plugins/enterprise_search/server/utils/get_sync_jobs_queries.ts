/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { ConnectorStatus, ConnectorType, SyncStatus } from '@kbn/search-connectors';

export const getOrphanedJobsCountQuery = (ids: string[], connectorType?: ConnectorType) => {
  if (!connectorType) {
    return {
      bool: {
        must_not: [
          {
            terms: {
              'connector.id': ids,
            },
          },
        ],
      },
    };
  }

  if (connectorType === 'elastic-crawler') {
    return {
      bool: {
        must: [
          {
            term: {
              'connector.service_type': 'elastic-crawler',
            },
          },
        ],
        must_not: [
          {
            terms: {
              'connector.id': ids,
            },
          },
        ],
      },
    };
  }

  return {
    bool: {
      must_not: [
        {
          terms: {
            'connector.id': ids,
          },
        },
        {
          term: {
            'connector.service_type': 'elastic-crawler',
          },
        },
      ],
    },
  };
};

export const getInProgressJobsCountQuery = (connectorType?: ConnectorType) => {
  if (!connectorType) {
    return {
      bool: {
        must: [
          {
            term: {
              status: SyncStatus.IN_PROGRESS,
            },
          },
        ],
      },
    };
  }

  if (connectorType === 'elastic-crawler') {
    return {
      bool: {
        must: [
          {
            term: {
              status: SyncStatus.IN_PROGRESS,
            },
          },
        ],
        filter: [
          {
            bool: {
              must: {
                term: {
                  'connector.service_type': 'elastic-crawler',
                },
              },
            },
          },
        ],
      },
    };
  }
  return {
    bool: {
      must: [
        {
          term: {
            status: SyncStatus.IN_PROGRESS,
          },
        },
      ],
      filter: [
        {
          bool: {
            must_not: {
              term: {
                'connector.service_type': 'elastic-crawler',
              },
            },
          },
        },
      ],
    },
  };
};

export const getIdleJobsCountQuery = (connectorType?: ConnectorType) => {
  if (!connectorType) {
    return {
      bool: {
        filter: [
          {
            term: {
              status: SyncStatus.IN_PROGRESS,
            },
          },
          {
            range: {
              last_seen: {
                lt: moment().subtract(1, 'minute').toISOString(),
              },
            },
          },
        ],
      },
    };
  }

  if (connectorType === 'elastic-crawler') {
    return {
      bool: {
        filter: [
          {
            term: {
              status: SyncStatus.IN_PROGRESS,
            },
          },
          {
            term: {
              'connector.service_type': 'elastic-crawler',
            },
          },
          {
            range: {
              last_seen: {
                lt: moment().subtract(1, 'minute').toISOString(),
              },
            },
          },
        ],
      },
    };
  }

  return {
    bool: {
      filter: [
        {
          term: {
            status: SyncStatus.IN_PROGRESS,
          },
        },
        {
          bool: {
            must_not: {
              term: {
                'connector.service_type': 'elastic-crawler',
              },
            },
          },
        },
        {
          range: {
            last_seen: {
              lt: moment().subtract(1, 'minute').toISOString(),
            },
          },
        },
      ],
    },
  };
};

export const getErrorCountQuery = (connectorType?: ConnectorType) => {
  if (!connectorType) {
    return {
      bool: {
        must: [
          {
            term: {
              last_sync_status: SyncStatus.ERROR,
            },
          },
        ],
      },
    };
  }

  if (connectorType === 'elastic-crawler') {
    return {
      bool: {
        must: [
          {
            term: {
              last_sync_status: SyncStatus.ERROR,
            },
          },
        ],
        filter: [
          {
            term: {
              service_type: 'elastic-crawler',
            },
          },
        ],
      },
    };
  }

  return {
    bool: {
      must: [
        {
          term: {
            last_sync_status: SyncStatus.ERROR,
          },
        },
      ],
      filter: [
        {
          bool: {
            must_not: {
              term: {
                service_type: 'elastic-crawler',
              },
            },
          },
        },
      ],
    },
  };
};

export const getConnectedCountQuery = (connectorType?: ConnectorType) => {
  if (connectorType) {
    return {
      bool: {
        filter: [
          {
            term: {
              status: ConnectorStatus.CONNECTED,
            },
          },
          {
            range: {
              last_seen: {
                gte: moment().subtract(30, 'minutes').toISOString(),
              },
            },
          },
        ],
      },
    };
  }
  if (connectorType === 'elastic-crawler') {
    return {
      bool: {
        filter: [
          {
            term: {
              status: ConnectorStatus.CONNECTED,
            },
          },
          {
            term: {
              'connector.service_type': 'elastic-crawler',
            },
          },
          {
            range: {
              last_seen: {
                gte: moment().subtract(30, 'minutes').toISOString(),
              },
            },
          },
        ],
      },
    };
  }
  return {
    bool: {
      filter: [
        {
          term: {
            status: ConnectorStatus.CONNECTED,
          },
        },
        {
          bool: {
            must_not: {
              term: {
                'connector.service_type': 'elastic-crawler',
              },
            },
          },
        },
        {
          range: {
            last_seen: {
              gte: moment().subtract(30, 'minutes').toISOString(),
            },
          },
        },
      ],
    },
  };
};

export const getIncompleteCountQuery = (connectorType?: ConnectorType) => {
  if (!connectorType) {
    return {
      bool: {
        should: [
          {
            bool: {
              must_not: {
                terms: {
                  status: [ConnectorStatus.CONNECTED, ConnectorStatus.ERROR],
                },
              },
            },
          },
          {
            range: {
              last_seen: {
                lt: moment().subtract(30, 'minutes').toISOString(),
              },
            },
          },
        ],
      },
    };
  }
  if (connectorType === 'elastic-crawler') {
    return {
      bool: {
        should: [
          {
            bool: {
              must_not: {
                terms: {
                  status: [ConnectorStatus.CONNECTED, ConnectorStatus.ERROR],
                },
              },
            },
          },
          {
            range: {
              last_seen: {
                lt: moment().subtract(30, 'minutes').toISOString(),
              },
            },
          },
        ],
        filter: [
          {
            term: {
              service_type: 'elastic-crawler',
            },
          },
        ],
      },
    };
  }
  return {
    bool: {
      should: [
        {
          bool: {
            must_not: {
              terms: {
                status: [ConnectorStatus.CONNECTED, ConnectorStatus.ERROR],
              },
            },
          },
        },
        {
          range: {
            last_seen: {
              lt: moment().subtract(30, 'minutes').toISOString(),
            },
          },
        },
      ],
      filter: [
        {
          bool: {
            must_not: {
              term: {
                service_type: 'elastic-crawler',
              },
            },
          },
        },
      ],
    },
  };
};
