/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitorSummary, Ping } from '../../../../common/runtime_types';
import { addBasePath } from './add_base_path';
import { buildHref } from './build_href';

export const getLoggingContainerHref = (
  summary: MonitorSummary,
  basePath: string
): string | undefined => {
  const getHref = (value: string | string[] | undefined) => {
    if (!value) {
      return undefined;
    }
    const ret = !Array.isArray(value) ? value : value[0];
    return addBasePath(
      basePath,
      `/app/logs?logFilter=${encodeURI(`(expression:'container.id : ${ret}',kind:kuery)`)}`
    );
  };
  return buildHref(summary.state.summaryPings || [], (ping: Ping) => ping?.container?.id, getHref);
};

export const getLoggingKubernetesHref = (summary: MonitorSummary, basePath: string) => {
  const getHref = (value: string | string[] | undefined) => {
    if (!value) {
      return undefined;
    }
    const ret = !Array.isArray(value) ? value : value[0];
    return addBasePath(
      basePath,
      `/app/logs?logFilter=${encodeURI(`(expression:'pod.uid : ${ret}',kind:kuery)`)}`
    );
  };
  return buildHref(
    summary.state.summaryPings || [],
    (ping: Ping) => ping?.kubernetes?.pod?.uid,
    getHref
  );
};

export const getLoggingIpHref = (summary: MonitorSummary, basePath: string) => {
  const getHref = (value: string | string[] | undefined) => {
    if (!value) {
      return undefined;
    }
    const ret = !Array.isArray(value) ? value : value[0];
    return addBasePath(
      basePath,
      `/app/logs?logFilter=(expression:'${encodeURIComponent(`host.ip : ${ret}`)}',kind:kuery)`
    );
  };
  return buildHref(summary.state.summaryPings || [], (ping: Ping) => ping?.monitor?.ip, getHref);
};
