/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export function setIndicesFound(metrics: any, setFromMetricbeat: boolean = false) {
  return Object.keys(metrics).reduce((accum: any, metricName) => {
    accum[metricName] = metrics[metricName].map(
      (item: { indices_found: { internal: boolean; ecs: boolean } }, index: number) => {
        if (item.indices_found) {
          return {
            ...item,
            indices_found: {
              internal: !setFromMetricbeat,
              ecs: setFromMetricbeat,
            },
          };
        }
        return item;
      }
    );
    return accum;
  }, {});
}
