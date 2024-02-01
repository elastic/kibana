import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  getSLOSummaryPipelineId,
  getSLOSummaryTransformId,
  getSLOTransformId,
  SLO_DESTINATION_INDEX_PATTERN,
  SLO_RESOURCES_VERSION,
  SLO_SUMMARY_INDEX_TEMPLATE_PATTERN,
} from '@kbn/observability-plugin/common/slo/constants';
import { SLO } from '../../domain/models';
import { SLORepository } from './slo_repository';

const GREEN = 'green';
const RED = 'red';

export class GetSloHealth {
  constructor(private esClient: ElasticsearchClient, private sloRepository: SLORepository) {}

  public async execute(sloId: string) {
    const slo = await this.sloRepository.findById(sloId);

    const transformHealth = await this.getRollupTransformHealth(slo);
    const summaryTransformHealth = await this.getSummaryTransformHealth(slo);
    const summaryIngestPipelineHealth = await this.getIngestPipelineHealth(slo);
    const overallHealth =
      transformHealth === GREEN &&
      summaryTransformHealth === GREEN &&
      summaryIngestPipelineHealth === GREEN
        ? GREEN
        : RED;

    const summaryDoc = await this.esClient.search({
      index: SLO_SUMMARY_INDEX_TEMPLATE_PATTERN,
      query: {
        bool: {
          filter: [{ term: { 'slo.id': slo.id } }, { term: { 'slo.revision': slo.revision } }],
        },
      },
      size: 1,
    });
    // @ts-ignore
    const summaryUpdatedAt = summaryDoc.hits.hits[0]?._source?.summaryUpdatedAt;

    const rollupDocument = await this.esClient.search({
      index: SLO_DESTINATION_INDEX_PATTERN,
      query: {
        bool: {
          filter: [{ term: { 'slo.id': slo.id } }, { term: { 'slo.revision': slo.revision } }],
        },
      },
      sort: {
        'event.ingested': {
          order: 'desc',
        },
      },
      size: 1,
    });

    // @ts-ignore
    const lastRollupDocumentIngestedAt = rollupDocument.hits.hits[0]?._source?.event.ingested;

    return {
      health: overallHealth,
      details: {
        rollupTransform: transformHealth,
        summaryTransform: summaryTransformHealth,
        summaryIngestPipeline: summaryIngestPipelineHealth,
        summaryDocumentUpdatedAt: summaryUpdatedAt,
        lastRollupDocumentIngestedAt,
      },
    };
  }

  private async getSummaryTransformHealth(slo: SLO) {
    const summaryTransformResponse = await this.esClient.transform.getTransformStats(
      { transform_id: getSLOSummaryTransformId(slo.id, slo.revision) },
      { ignore: [404] }
    );

    return ['green', 'GREEN'].includes(
      summaryTransformResponse.transforms[0]?.health?.status ?? 'red'
    )
      ? GREEN
      : RED;
  }

  private async getRollupTransformHealth(slo: SLO) {
    const transformResponse = await this.esClient.transform.getTransformStats(
      { transform_id: getSLOTransformId(slo.id, slo.revision) },
      { ignore: [404] }
    );

    return ['green', 'GREEN'].includes(transformResponse.transforms[0]?.health?.status ?? 'red')
      ? GREEN
      : RED;
  }

  private async getIngestPipelineHealth(slo: SLO) {
    const summaryIngestPipelineId = getSLOSummaryPipelineId(slo.id, slo.revision);
    const ingestResponse = await this.esClient.ingest.getPipeline(
      { id: summaryIngestPipelineId },
      { ignore: [404] }
    );

    // @ts-ignore _meta not typed
    return ingestResponse?.[summaryIngestPipelineId]?._meta?.version === SLO_RESOURCES_VERSION
      ? GREEN
      : RED;
  }
}
