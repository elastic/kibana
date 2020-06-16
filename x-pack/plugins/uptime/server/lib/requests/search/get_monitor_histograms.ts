import { HistogramPoint, Histogram } from '../../../../common/runtime_types';
import { QueryContext } from '.';
import { getHistogramInterval } from '../../helper/get_histogram_interval';

export const getHistogramForMonitors = async (
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
}