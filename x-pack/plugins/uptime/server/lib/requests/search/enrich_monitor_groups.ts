/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { QueryContext } from './query_context';
import {
  Check,
  Histogram,
  HistogramPoint,
  MonitorSummary,
  CursorDirection,
  SortOrder,
} from '../../../../common/runtime_types';
import { MonitorEnricher } from './fetch_page';
import { getHistogramInterval } from '../../helper/get_histogram_interval';

export const enrichMonitorGroups: MonitorEnricher = async (
  queryContext: QueryContext,
  checkGroups: string[]
): Promise<MonitorSummary[]> => {
  // TODO the scripted metric query here is totally unnecessary and largely
  // redundant with the way the code works now. This could be simplified
  // to a much simpler query + some JS processing.
  const params = {
    index: queryContext.heartbeatIndices,
    body: {
      query: {
        bool: {
          filter: [{ terms: { 'monitor.check_group': checkGroups } }],
        },
      },
      size: 0,
      aggs: {
        monitors: {
          composite: {
            /**
             * TODO: extract this to a constant; we can't be looking for _only_
             * ten monitors, because it's possible our check groups selection will represent more than ten.
             *
             * We were previously passing the after key from the check groups query regardless of the number of monitors we had,
             * it's important that the latest check group from the final monitor we use is what we return, or we will be way ahead in terms
             * of check groups and end up skipping monitors on subsequent calls.
             */
            size: 500,
            sources: [
              {
                monitor_id: {
                  terms: {
                    field: 'monitor.id',
                    order: cursorDirectionToOrder(queryContext.pagination.cursorDirection),
                  },
                },
              },
            ],
          },
          aggregations: {
            state: {
              scripted_metric: {
                init_script: `
                        // Globals are values that should be identical across all docs
                        // We can cheat a bit by always overwriting these and make the
                        // assumption that there is no variation in these across checks
                        state.globals = new HashMap();
                        // Here we store stuff broken out by agent.id and monitor.id
                        // This should correspond to a unique check.
                        state.checksByAgentIdIP = new HashMap();
                `,
                map_script: `
                                            Map curCheck = new HashMap();
                        String agentId = doc["agent.id"][0];
                        String ip = null;
                        if (doc["monitor.ip"].length > 0) {
                          ip = doc["monitor.ip"][0];
                        }
                        String agentIdIP = agentId + "-" + (ip == null ? "" : ip.toString());
                        def ts = doc["@timestamp"][0].toInstant().toEpochMilli();

                        def lastCheck = state.checksByAgentIdIP[agentId];
                        Instant lastTs = lastCheck != null ? lastCheck["@timestamp"] : null;
                        if (lastTs != null && lastTs > ts) {
                          return;
                        }

                        curCheck.put("@timestamp", ts);

                        Map agent = new HashMap();
                        agent.id = agentId;
                        curCheck.put("agent", agent);

                        if (state.globals.url == null) {
                          Map url = new HashMap();
                          Collection fields = ["full", "original", "scheme", "username", "password", "domain", "port", "path", "query", "fragment"];
                          for (field in fields) {
                            String docPath = "url." + field;
                            def val = doc[docPath];
                            if (!val.isEmpty()) {
                              url[field] = val[0];
                            }
                          }
                          state.globals.url = url;
                        }

                        Map monitor = new HashMap();
                        monitor.status = doc["monitor.status"][0];
                        monitor.ip = ip;
                        if (!doc["monitor.name"].isEmpty()) {
                          String monitorName = doc["monitor.name"][0];
                          if (monitor.name != "") {
                            monitor.name = monitorName;
                          }
                        }
                        curCheck.monitor = monitor;

                        if (curCheck.observer == null) {
                          curCheck.observer = new HashMap();
                        }
                        if (curCheck.observer.geo == null) {
                          curCheck.observer.geo = new HashMap();
                        }
                        if (!doc["observer.geo.name"].isEmpty()) {
                          curCheck.observer.geo.name = doc["observer.geo.name"][0];
                        }
                        if (!doc["observer.geo.location"].isEmpty()) {
                          curCheck.observer.geo.location = doc["observer.geo.location"][0];
                        }
                        if (!doc["kubernetes.pod.uid"].isEmpty() && curCheck.kubernetes == null) {
                          curCheck.kubernetes = new HashMap();
                          curCheck.kubernetes.pod = new HashMap();
                          curCheck.kubernetes.pod.uid = doc["kubernetes.pod.uid"][0];
                        }
                        if (!doc["container.id"].isEmpty() && curCheck.container == null) {
                          curCheck.container = new HashMap();
                          curCheck.container.id = doc["container.id"][0];
                        }
                        if (curCheck.tls == null) {
                          curCheck.tls = new HashMap();
                        }
                         if (!doc["tls.certificate_not_valid_after"].isEmpty()) {
                          curCheck.tls.not_after = doc["tls.certificate_not_valid_after"][0];
                        }
                         if (!doc["tls.certificate_not_valid_before"].isEmpty()) {
                          curCheck.tls.not_before = doc["tls.certificate_not_valid_before"][0];
                        }

                        state.checksByAgentIdIP[agentIdIP] = curCheck;
                `,
                combine_script: 'return state;',
                reduce_script: `
                        // The final document
                        Map result = new HashMap();

                        Map checks = new HashMap();
                        Instant maxTs = Instant.ofEpochMilli(0);
                        Collection ips = new HashSet();
                        Collection geoNames = new HashSet();
                        Collection podUids = new HashSet();
                        Collection containerIds = new HashSet();
                        Collection tls = new HashSet();
                        String name = null;
                        for (state in states) {
                          result.putAll(state.globals);
                          for (entry in state.checksByAgentIdIP.entrySet()) {
                            def agentIdIP = entry.getKey();
                            def check = entry.getValue();
                            def lastBestCheck = checks.get(agentIdIP);
                            def checkTs = Instant.ofEpochMilli(check.get("@timestamp"));

                            if (maxTs.isBefore(checkTs)) { maxTs = checkTs}

                            if (lastBestCheck == null || lastBestCheck.get("@timestamp") < checkTs) {
                              check["@timestamp"] = check["@timestamp"];
                              checks[agentIdIP] = check
                            }

                            if (check.monitor.name != null && check.monitor.name != "") {
                              name = check.monitor.name;
                            }

                            ips.add(check.monitor.ip);
                            if (check.observer != null && check.observer.geo != null && check.observer.geo.name != null) {
                              geoNames.add(check.observer.geo.name);
                            }
                            if (check.kubernetes != null && check.kubernetes.pod != null) {
                              podUids.add(check.kubernetes.pod.uid);
                            }
                            if (check.container != null) {
                              containerIds.add(check.container.id);
                            }
                            if (check.tls != null) {
                              tls.add(check.tls);
                            }
                          }
                        }

                        // We just use the values so we can store these as nested docs
                        result.checks = checks.values();
                        result.put("@timestamp", maxTs);


                        Map summary = new HashMap();
                        summary.up = checks.entrySet().stream().filter(c -> c.getValue().monitor.status == "up").count();
                        summary.down = checks.size() - summary.up;
                        result.summary = summary;

                        Map monitor = new HashMap();
                        monitor.ip = ips;
                        monitor.name = name;
                        monitor.status = summary.down > 0 ? "down" : "up";
                        result.monitor = monitor;

                        Map observer = new HashMap();
                        Map geo = new HashMap();
                        observer.geo = geo;
                        geo.name = geoNames;
                        result.observer = observer;

                        if (!podUids.isEmpty()) {
                          result.kubernetes = new HashMap();
                          result.kubernetes.pod = new HashMap();
                          result.kubernetes.pod.uid = podUids;
                        }

                        if (!containerIds.isEmpty()) {
                          result.container = new HashMap();
                          result.container.id = containerIds;
                        }

                        if (!tls.isEmpty()) {
                          result.tls = new HashMap();
                          result.tls = tls;
                        }

                        return result;
                `,
              },
            },
          },
        },
      },
    },
  };

  const items = await queryContext.search(params);

  const monitorBuckets = items?.aggregations?.monitors?.buckets ?? [];

  const monitorIds: string[] = [];
  const summaries: MonitorSummary[] = monitorBuckets.map((monitor: any) => {
    const monitorId = monitor.key.monitor_id;
    monitorIds.push(monitorId);
    const state: any = monitor.state?.value;
    state.timestamp = state['@timestamp'];
    const { checks } = state;
    if (Array.isArray(checks)) {
      checks.sort(sortChecksBy);
      state.checks = state.checks.map((check: any) => ({
        ...check,
        timestamp: check['@timestamp'],
      }));
    } else {
      state.checks = [];
    }
    return {
      monitor_id: monitorId,
      state,
    };
  });

  const histogramMap = await getHistogramForMonitors(queryContext, monitorIds);

  const resItems = summaries.map((summary) => ({
    ...summary,
    histogram: histogramMap[summary.monitor_id],
  }));

  const sortedResItems: any = resItems.sort((a, b) => {
    if (a.monitor_id === b.monitor_id) return 0;
    return a.monitor_id > b.monitor_id ? 1 : -1;
  });

  if (queryContext.pagination.sortOrder === SortOrder.DESC) {
    sortedResItems.reverse();
  }

  return sortedResItems;
};

const getHistogramForMonitors = async (
  queryContext: QueryContext,
  monitorIds: string[]
): Promise<{ [key: string]: Histogram }> => {
  const params = {
    index: queryContext.heartbeatIndices,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              range: {
                'summary.down': { gt: 0 },
              },
            },
            {
              terms: {
                'monitor.id': monitorIds,
              },
            },
            {
              range: {
                '@timestamp': {
                  gte: queryContext.dateRangeStart,
                  lte: queryContext.dateRangeEnd,
                },
              },
            },
          ],
        },
      },
      aggs: {
        histogram: {
          date_histogram: {
            field: '@timestamp',
            // 12 seems to be a good size for performance given
            // long monitor lists of up to 100 on the overview page
            fixed_interval:
              getHistogramInterval(queryContext.dateRangeStart, queryContext.dateRangeEnd, 12) +
              'ms',
            missing: 0,
          },
          aggs: {
            by_id: {
              terms: {
                field: 'monitor.id',
                size: Math.max(monitorIds.length, 1),
              },
              aggs: {
                totalDown: {
                  sum: { field: 'summary.down' },
                },
              },
            },
          },
        },
      },
    },
  };
  const result = await queryContext.search(params);

  const histoBuckets: any[] = result.aggregations.histogram.buckets;
  const simplified = histoBuckets.map((histoBucket: any): { timestamp: number; byId: any } => {
    const byId: { [key: string]: number } = {};
    histoBucket.by_id.buckets.forEach((idBucket: any) => {
      byId[idBucket.key] = idBucket.totalDown.value;
    });
    return {
      timestamp: parseInt(histoBucket.key, 10),
      byId,
    };
  });

  const histosById: { [key: string]: Histogram } = {};
  monitorIds.forEach((id: string) => {
    const points: HistogramPoint[] = [];
    simplified.forEach((simpleHisto) => {
      points.push({
        timestamp: simpleHisto.timestamp,
        up: undefined,
        down: simpleHisto.byId[id],
      });
    });
    histosById[id] = { points };
  });

  return histosById;
};

const cursorDirectionToOrder = (cd: CursorDirection): 'asc' | 'desc' => {
  return CursorDirection[cd] === CursorDirection.AFTER ? 'asc' : 'desc';
};

export const sortChecksBy = (
  a: Pick<Check, 'observer' | 'monitor'>,
  b: Pick<Check, 'observer' | 'monitor'>
) => {
  const nameA: string = a.observer?.geo?.name ?? '';
  const nameB: string = b.observer?.geo?.name ?? '';
  if (nameA === nameB) {
    let ipA: string;
    let ipB: string;
    if (Array.isArray(a.monitor.ip)) {
      a.monitor.ip.sort();
      ipA = a.monitor.ip?.[0] ?? '';
    } else {
      ipA = a.monitor.ip ?? '';
    }
    if (Array.isArray(b.monitor.ip)) {
      b.monitor.ip.sort();
      ipB = b.monitor.ip?.[0] ?? '';
    } else {
      ipB = b.monitor.ip ?? '';
    }

    if (ipA === ipB) {
      return 0;
    }
    return ipA > ipB ? 1 : -1;
  }
  return nameA > nameB ? 1 : -1;
};
