/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { UptimeESClient } from '../lib';
import { UptimeServerSetup } from '../adapters';
import { SyntheticsMonitorSavedObject } from '../../../common/types';
import { MonitorFields, Ping } from '../../../common/runtime_types';

export const hydrateSavedObjects = async ({
  monitors,
  server,
}: {
  monitors: SyntheticsMonitorSavedObject[];
  server: UptimeServerSetup;
}) => {
  try {
    const missingUrlInfoIds: string[] = [];

    monitors
      .filter((monitor) => monitor.attributes.type === 'browser')
      .forEach(({ attributes, id }) => {
        const monitor = attributes as MonitorFields;
        if (!monitor || !monitor.urls) {
          missingUrlInfoIds.push(id);
        }
      });

    if (missingUrlInfoIds.length > 0 && server.uptimeEsClient) {
      const esDocs: Ping[] = await fetchSampleMonitorDocuments(
        server.uptimeEsClient,
        missingUrlInfoIds
      );
      const updatedObjects = monitors
        .filter((monitor) => missingUrlInfoIds.includes(monitor.id))
        .map((monitor) => {
          let url = '';
          esDocs.forEach((doc) => {
            // to make sure the document is ingested after the latest update of the monitor
            const diff = moment(monitor.updated_at).diff(moment(doc.timestamp), 'minutes');
            if (doc.config_id === monitor.id && doc.url?.full && diff > 1) {
              url = doc.url?.full;
            }
          });
          if (url) {
            return { ...monitor, attributes: { ...monitor.attributes, urls: url } };
          }
          return monitor;
        });
      await server.authSavedObjectsClient?.bulkUpdate(updatedObjects);
    }
  } catch (e) {
    server.logger.error(e);
  }
};

const fetchSampleMonitorDocuments = async (esClient: UptimeESClient, configIds: string[]) => {
  const data = await esClient.search({
    body: {
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: 'now-15m',
                  lt: 'now',
                },
              },
            },
            {
              terms: {
                config_id: configIds,
              },
            },
            {
              term: {
                'monitor.type': 'browser',
              },
            },
            {
              exists: {
                field: 'summary',
              },
            },
            {
              exists: {
                field: 'url.full',
              },
            },
          ],
        },
      },
      _source: ['url', 'config_id', '@timestamp'],
      collapse: {
        field: 'config_id',
      },
    },
  });

  return data.body.hits.hits.map(
    ({ _source: doc }) => ({ ...(doc as any), timestamp: (doc as any)['@timestamp'] } as Ping)
  );
};
