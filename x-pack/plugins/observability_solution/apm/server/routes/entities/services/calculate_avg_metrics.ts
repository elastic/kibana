import { MergedServiceEntities, EntityMetrics } from '../get_entities';
import { mapValues } from 'lodash';

export function calculateAvgMetrics(entities: MergedServiceEntities[]) {
  return entities.map((entity) => {
    const transformedMetrics = mergeMetrics(entity.metrics);
    const averages = mapValues(transformedMetrics, (values) => {
      const sum = values.reduce((acc, val) => acc + (val !== null ? val : 0), 0);
      return sum / values.length;
    });

    return {
      ...entity,
      metrics: averages,
    };
  });
}

export function mergeMetrics(metrics: EntityMetrics[]) {
  const mergedMetrics: { [key: string]: any[] } = {};
  metrics.forEach((metric) => {
    Object.keys(metric).forEach((key) => {
      if (!mergedMetrics[key]) {
        mergedMetrics[key] = [];
      }
      mergedMetrics[key].push(metric[key]);
    });
  });

  return mergedMetrics;
}
