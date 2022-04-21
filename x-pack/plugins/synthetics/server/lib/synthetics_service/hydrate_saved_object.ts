/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { UptimeESClient } from '../lib';
import { UptimeServerSetup } from '../adapters';
import { DecryptedSyntheticsMonitorSavedObject } from '../../../common/types';
import { SyntheticsMonitor, MonitorFields, Ping } from '../../../common/runtime_types';
import { SYNTHETICS_INDEX_PATTERN } from '../../../common/constants';

export const hydrateSavedObjects = async ({
  monitors,
  server,
}: {
  monitors: DecryptedSyntheticsMonitorSavedObject[];
  server: UptimeServerSetup;
}) => {
  try {
    const missingInfoIds: string[] = monitors
      .filter((monitor) => {
        const isBrowserMonitor = monitor.attributes.type === 'browser';
        const isHTTPMonitor = monitor.attributes.type === 'http';
        const isTCPMonitor = monitor.attributes.type === 'tcp';

        const monitorAttributes = monitor.attributes as MonitorFields;
        const isMissingUrls = !monitorAttributes || !monitorAttributes.urls;
        const isMissingPort = !monitorAttributes || !monitorAttributes['url.port'];

        const isEnrichableBrowserMonitor = isBrowserMonitor && (isMissingUrls || isMissingPort);
        const isEnrichableHttpMonitor = isHTTPMonitor && isMissingPort;
        const isEnrichableTcpMonitor = isTCPMonitor && isMissingPort;

        return isEnrichableBrowserMonitor || isEnrichableHttpMonitor || isEnrichableTcpMonitor;
      })
      .map(({ id }) => id);

    if (missingInfoIds.length > 0 && server.uptimeEsClient) {
      const esDocs: Ping[] = await fetchSampleMonitorDocuments(
        server.uptimeEsClient,
        missingInfoIds
      );

      const updatedObjects: DecryptedSyntheticsMonitorSavedObject[] = [];
      monitors
        .filter((monitor) => missingInfoIds.includes(monitor.id))
        .forEach((monitor) => {
          let resultAttributes: Partial<SyntheticsMonitor> = monitor.attributes;

          let isUpdated = false;

          esDocs.forEach((doc) => {
            // to make sure the document is ingested after the latest update of the monitor
            const documentIsAfterLatestUpdate = moment(monitor.updated_at).isBefore(
              moment(doc.timestamp)
            );
            if (!documentIsAfterLatestUpdate) return monitor;
            if (doc.config_id !== monitor.id) return monitor;

            if (doc.url?.full) {
              isUpdated = true;
              resultAttributes = { ...resultAttributes, urls: doc.url?.full };
            }

            if (doc.url?.port) {
              isUpdated = true;
              resultAttributes = { ...resultAttributes, ['url.port']: doc.url?.port };
            }
          });
          if (isUpdated) {
            updatedObjects.push({
              ...monitor,
              attributes: resultAttributes,
            } as DecryptedSyntheticsMonitorSavedObject);
          }
        });

      await server.authSavedObjectsClient?.bulkUpdate(updatedObjects);
    }
  } catch (e) {
    server.logger.error(e);
  }
};

const fetchSampleMonitorDocuments = async (esClient: UptimeESClient, configIds: string[]) => {
  const data = await esClient.search(
    {
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
                exists: {
                  field: 'summary',
                },
              },
              {
                bool: {
                  minimum_should_match: 1,
                  should: [{ exists: { field: 'url.full' } }, { exists: { field: 'url.port' } }],
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
    },
    'getHydrateQuery',
    SYNTHETICS_INDEX_PATTERN
  );

  return data.body.hits.hits.map(
    ({ _source: doc }) => ({ ...(doc as any), timestamp: (doc as any)['@timestamp'] } as Ping)
  );
};
