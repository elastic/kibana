/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CpuUsageAlert } from './cpu_usage_alert';
import { ALERT_CPU_USAGE } from '../../common/constants';
import { fetchCpuUsageNodeStats } from '../lib/alerts/fetch_cpu_usage_node_stats';
import { fetchClusters } from '../lib/alerts/fetch_clusters';

const RealDate = Date;

jest.mock('../lib/alerts/fetch_cpu_usage_node_stats', () => ({
  fetchCpuUsageNodeStats: jest.fn(),
}));
jest.mock('../lib/alerts/fetch_clusters', () => ({
  fetchClusters: jest.fn(),
}));

describe('CpuUsageAlert', () => {
  it('should have defaults', () => {
    const alert = new CpuUsageAlert();
    expect(alert.type).toBe(ALERT_CPU_USAGE);
    expect(alert.label).toBe('CPU Usage');
    expect(alert.defaultThrottle).toBe('1m');
    // @ts-ignore
    expect(alert.defaultParams).toStrictEqual({ threshold: 90, duration: '5m' });
    // @ts-ignore
    expect(alert.actionVariables).toStrictEqual([
      { name: 'state', description: 'The current state of the alert.' },
      { name: 'nodes', description: 'The list of nodes that are reporting high cpu usage.' },
      { name: 'count', description: 'The number of nodes that are reporting high cpu usage.' },
      { name: 'clusterName', description: 'The name of the cluster to which the nodes belong.' },
      { name: 'action', description: 'The recommended action to take based on this alert firing.' },
    ]);
  });

  describe('execute', () => {
    function FakeDate() {}
    FakeDate.prototype.valueOf = () => 1;

    const clusterUuid = 'abc123';
    const nodeId = 'myNodeId';
    const nodeName = 'myNodeName';
    const cpuUsage = 91;
    const stat = {
      clusterUuid,
      nodeId,
      nodeName,
      cpuUsage,
    };
    const getUiSettingsService = () => ({
      asScopedToClient: jest.fn(),
    });
    const getLogger = () => ({
      debug: jest.fn(),
    });
    const monitoringCluster = null;
    const config = {
      ui: { ccs: { enabled: true }, container: { elasticsearch: { enabled: false } } },
    };
    const kibanaUrl = '';

    const replaceState = jest.fn();
    const scheduleActions = jest.fn();
    const getState = jest.fn();
    const executorOptions = {
      services: {
        callCluster: jest.fn(),
        alertInstanceFactory: jest.fn().mockImplementation(() => {
          return {
            replaceState,
            scheduleActions,
            getState,
          };
        }),
      },
      state: {},
    };

    beforeEach(() => {
      // @ts-ignore
      Date = FakeDate;
      (fetchCpuUsageNodeStats as jest.Mock).mockImplementation(() => {
        return [stat];
      });
      (fetchClusters as jest.Mock).mockImplementation(() => {
        return [{ clusterUuid }];
      });
    });

    afterEach(() => {
      Date = RealDate;
      replaceState.mockClear();
      scheduleActions.mockClear();
      getState.mockClear();
    });

    it('should fire actions', async () => {
      const alert = new CpuUsageAlert();
      alert.initializeAlertType(
        getUiSettingsService as any,
        monitoringCluster as any,
        getLogger as any,
        config as any,
        kibanaUrl
      );
      const type = alert.getAlertType();
      await type.executor({
        ...executorOptions,
        // @ts-ignore
        params: alert.defaultParams,
      } as any);
      expect(replaceState).toHaveBeenCalledWith({
        alertStates: [
          {
            cluster: { clusterUuid },
            cpuUsage,
            nodeId,
            nodeName,
            ui: {
              isFiring: true,
              message: {
                text:
                  'Node #start_linkmyNodeName#end_link is reporting cpu usage of 91.00% at #absolute',
                nextSteps: [
                  {
                    text: '#start_linkCheck hot threads#end_link',
                    tokens: [
                      {
                        startToken: '#start_link',
                        endToken: '#end_link',
                        type: 'docLink',
                        partialUrl:
                          '{elasticWebsiteUrl}/guide/en/elasticsearch/reference/{docLinkVersion}/cluster-nodes-hot-threads.html',
                      },
                    ],
                  },
                  {
                    text: '#start_linkCheck long running tasks#end_link',
                    tokens: [
                      {
                        startToken: '#start_link',
                        endToken: '#end_link',
                        type: 'docLink',
                        partialUrl:
                          '{elasticWebsiteUrl}/guide/en/elasticsearch/reference/{docLinkVersion}/tasks.html',
                      },
                    ],
                  },
                ],
                tokens: [
                  {
                    startToken: '#absolute',
                    type: 'time',
                    isAbsolute: true,
                    isRelative: false,
                    timestamp: 1,
                  },
                  {
                    startToken: '#start_link',
                    endToken: '#end_link',
                    type: 'link',
                    url: 'elasticsearch/nodes/myNodeId',
                  },
                ],
              },
              severity: 'danger',
              resolvedMS: 0,
              triggeredMS: 1,
              lastCheckedMS: 0,
            },
          },
        ],
      });
    });

    it('should not fire actions if under threshold', async () => {
      (fetchCpuUsageNodeStats as jest.Mock).mockImplementation(() => {
        return [
          {
            ...stat,
            cpuUsage: 1,
          },
        ];
      });
      const alert = new CpuUsageAlert();
      alert.initializeAlertType(
        getUiSettingsService as any,
        monitoringCluster as any,
        getLogger as any,
        config as any,
        kibanaUrl
      );
      const type = alert.getAlertType();
      await type.executor({
        ...executorOptions,
        // @ts-ignore
        params: alert.defaultParams,
      } as any);
      expect(replaceState).toHaveBeenCalledWith({
        alertStates: [
          {
            ccs: undefined,
            cluster: {
              clusterUuid,
            },
            cpuUsage: 1,
            nodeId,
            nodeName,
            ui: {
              isFiring: false,
              lastCheckedMS: 0,
              message: null,
              resolvedMS: 0,
              severity: 'danger',
              triggeredMS: 0,
            },
          },
        ],
      });
    });

    it('should resolve with a resolved message', async () => {
      (fetchCpuUsageNodeStats as jest.Mock).mockImplementation(() => {
        return [
          {
            ...stat,
            cpuUsage: 1,
          },
        ];
      });
      (getState as jest.Mock).mockImplementation(() => {
        return {
          alertStates: [
            {
              cluster: {
                clusterUuid,
              },
              ccs: null,
              cpuUsage: 91,
              nodeId,
              nodeName,
              ui: {
                isFiring: true,
                message: null,
                severity: 'danger',
                resolvedMS: 0,
                triggeredMS: 1,
                lastCheckedMS: 0,
              },
            },
          ],
        };
      });
      const alert = new CpuUsageAlert();
      alert.initializeAlertType(
        getUiSettingsService as any,
        monitoringCluster as any,
        getLogger as any,
        config as any,
        kibanaUrl
      );
      const type = alert.getAlertType();
      await type.executor({
        ...executorOptions,
        // @ts-ignore
        params: alert.defaultParams,
      } as any);
      expect(replaceState).toHaveBeenCalledWith({
        alertStates: [
          {
            cluster: { clusterUuid },
            ccs: null,
            cpuUsage: 1,
            nodeId,
            nodeName,
            ui: {
              isFiring: false,
              message: {
                text:
                  'The cpu usage on node myNodeName is now under the threshold, currently reporting at 1.00% as of #resolved',
                tokens: [
                  {
                    startToken: '#resolved',
                    type: 'time',
                    isAbsolute: true,
                    isRelative: false,
                    timestamp: 1,
                  },
                ],
              },
              severity: 'danger',
              resolvedMS: 1,
              triggeredMS: 1,
              lastCheckedMS: 0,
            },
          },
        ],
      });
    });
  });
});
