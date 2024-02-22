import { SLO } from '@kbn/observability-plugin/server/domain/models';
import { sloSchema } from '@kbn/slo-schema';
import { isLeft } from 'fp-ts/lib/Either';
import { EsSummaryDocument } from '../summary_transform_generator/helpers/create_temp_summary';

export function fromSummaryDocumentToSlo(summaryDoc: EsSummaryDocument): SLO | undefined {
  const res = sloSchema.decode({
    ...summaryDoc.slo,
    indicator: {
      type: 'sli.kql.custom',
      params: {
        index: 'irrelevant',
        good: 'irrelevant',
        total: 'irrelevant',
        timestampField: 'irrelevant',
      },
    },
    settings: { syncDelay: '1m', frequency: '1m' },
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    version: 1,
  });

  console.dir(res, { depth: 3 });

  if (isLeft(res)) {
    return undefined;
  } else {
    return res.right;
  }
}
