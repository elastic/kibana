// const entities = [
//   {
//     agent: {
//       name: ['go'],
//     },
//     data_stream: {
//       type: ['bar'],
//     },
//     entity: {
//       metric: {
//         failedTransactionRate: [0.5, 0.5],
//         latency: [500, 500],
//         logErrorRate: [null, null],
//         logRatePerMinute: [null, null],
//         throughput: [0.5, 0.5],
//       },
//     },
//     environments: ['apm-only-1-env'],
//     name: 'apm-only-1',
//   },
// ];
export function calculateAverageMetrics(entities) {
  return entities.map((obj) => {
    let metrics = obj.entity.metric;
    let metricKeys = Object.keys(metrics);
    let averagedMetrics = {};

    metricKeys.forEach((key) => {
      let values = metrics[key];
      if (Array.isArray(values)) {
        let validValues = values.filter((val) => val !== null);
        if (validValues.length > 0) {
          let sum = validValues.reduce((acc, val) => acc + val, 0);
          let avg = sum / validValues.length;
          averagedMetrics[key] = avg;
        } else {
          averagedMetrics[key] = null;
        }
      } else {
        averagedMetrics[key] = null;
      }
    });

    // console.log('object', obj);

    return {
      ...obj,
      entity: {
        ...obj.entity,
        metric: averagedMetrics,
      },
    };
  });
}
