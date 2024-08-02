/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { CspFinding } from '../../../common/schemas/csp_finding';
import { isArray } from 'lodash';
import { http, HttpResponse } from 'msw';
import { v4 as uuidV4 } from 'uuid';

export const generateMultipleCspFindings = (
  option: { count: number; failedCount?: number } = { count: 1, failedCount: 0 }
) => {
  const failedCount = option.failedCount || 0;
  return Array.from({ length: option?.count }, (_, i) => {
    return generateCspFinding(i.toString(), i < failedCount ? 'failed' : 'passed');
  });
};

export const generateCspFinding = (
  id: string,
  evaluation: 'failed' | 'passed' = 'passed'
): CspFinding => {
  const timeFiveHoursAgo = Date.now() - 18000000;
  const timeFiveHoursAgoToIsoString = new Date(timeFiveHoursAgo).toISOString();

  return {
    agent: {
      name: 'cloudbeatVM',
      id: `agent-${id}`,
      type: 'cloudbeat',
      version: '8.13.2',
    },
    resource: {
      account_id: `/subscriptions/${id}`,
      sub_type: 'azure-disk',
      account_name: 'csp-team',
      name: `disk_${id}`,
      id: `/subscriptions/${id}/test/disks/disk_${id}`,
      region: 'eastus',
      type: 'cloud-compute',
      raw: {
        id: `/subscriptions/${id}/test/disks/disk_${id}`,
        name: `disk_${id}`,
        type: 'microsoft.compute/disks',
        location: 'eastus',
        properties: {
          publicNetworkAccess: 'Enabled',
          osType: 'Linux',
        },
      },
    },
    rule: {
      rego_rule_id: 'AZU-1.0-1.0',
      references: 'https://elastic.co',
      impact: `impact ${id}`,
      description: `description ${id}`,
      section: `Section ${id}`,
      default_value: '',
      version: '1.0',
      rationale: `rationale ${id}`,
      benchmark: {
        name: 'CIS Microsoft Azure Foundations',
        rule_number: `1.1.${id}`,
        id: 'cis_azure',
        version: 'v2.0.0',
        posture_type: 'cspm',
      },
      tags: ['CIS', 'AZURE', 'CIS 1.0', `Section ${id}`],
      remediation: `remediation ${id}`,
      audit: `audit ${id}`,
      name: `Name ${id}`,
      id: `rule-${id}`,
      profile_applicability: 'profile',
    },
    result: {
      evaluation,
      evidence: {
        Resource: {
          name: `disk_${id}`,
          location: 'eastus',
          type: 'microsoft.compute/disks',
          properties: {
            publicNetworkAccess: 'Enabled',
            osType: 'Linux',
          },
        },
      },
    },
    cloud: {
      provider: 'azure',
      region: 'eastus',
      account: {
        name: 'test',
        id: `/subscriptions/${id}`,
      },
    },
    '@timestamp': timeFiveHoursAgoToIsoString,
    ecs: {
      version: '8.6.0',
    },
    host: {
      name: `host ${id}`,
      id: `host-${id}`,
      containerized: false,
      ip: ['0.0.0.0'],
      mac: ['00:00:00:00:00:00'],
      hostname: `host-${id}`,
      architecture: 'x86_64',
      os: {
        kernel: '4.19.0-16-cloud-amd64',
        codename: 'buster',
        type: 'linux',
        platform: 'debian',
        version: '10.3',
        family: 'debian',
        name: 'Debian GNU/Linux',
      },
    },
    event: {
      agent_id_status: 'auth_metadata_missing',
      sequence: 1715693351,
      ingested: timeFiveHoursAgoToIsoString,
      created: timeFiveHoursAgoToIsoString,
      kind: 'state',
      id: `event-${id}`,
      type: ['info'],
      category: ['configuration'],
      dataset: 'cloud_security_posture.findings',
      outcome: 'success',
    },
  };
};

export const generateFindingHit = (finding: CspFinding) => {
  return {
    _index: 'logs-cloud_security_posture.findings_latest-default',
    _id: uuidV4(),
    _score: null,
    _source: finding,
    sort: [1715693387715],
  };
};

const getFindingsBsearchResponse = (findings: CspFinding[]) => {
  const buckets = findings.reduce(
    (acc, finding) => {
      if (finding.result.evaluation === 'failed') {
        acc[0].doc_count = (acc[0].doc_count || 0) + 1;
      } else {
        acc[1].doc_count = (acc[1].doc_count || 0) + 1;
      }
      return acc;
    },
    [
      {
        key: 'failed',
        doc_count: 0,
      },
      {
        key: 'passed',
        doc_count: 0,
      },
    ]
  );

  return {
    id: 0,
    result: {
      rawResponse: {
        took: 1,
        timed_out: false,
        _shards: {
          total: 1,
          successful: 1,
          skipped: 0,
          failed: 0,
        },
        hits: {
          total: findings.length,
          max_score: null,
          hits: findings.map(generateFindingHit),
        },
        aggregations: {
          count: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets,
          },
        },
      },
      isPartial: false,
      isRunning: false,
      total: 1,
      loaded: 1,
      isRestored: false,
    },
  };
};

export const rulesGetStatesHandler = http.get(
  'internal/cloud_security_posture/rules/_get_states',
  () => {
    return HttpResponse.json({});
  }
);

export const bsearchFindingsHandler = (findings: CspFinding[]) =>
  http.post('internal/bsearch', async ({ request }) => {
    const jsonRequest = (await request.json()) as Partial<estypes.SearchRequest>;

    const filter = jsonRequest?.query?.bool?.filter;

    const hasRuleSectionQuerySearchTerm =
      isArray(filter) &&
      isArray(filter[0]?.bool?.should) &&
      filter[0]?.bool?.should?.[0]?.term?.['rule.section']?.value !== undefined;

    if (hasRuleSectionQuerySearchTerm) {
      const filteredFindings = findings.filter((finding) => {
        const termValue = (filter[0].bool?.should as estypes.QueryDslQueryContainer[])?.[0]?.term?.[
          'rule.section'
        ]?.value;
        return finding.rule.section === termValue;
      });

      return HttpResponse.json(getFindingsBsearchResponse(filteredFindings));
    }

    const hasRuleSectionFilter =
      isArray(filter) && filter?.[0]?.match_phrase?.['rule.section'] !== undefined;

    if (hasRuleSectionFilter) {
      const filteredFindings = findings.filter((finding) => {
        return finding.rule.section === filter?.[0]?.match_phrase?.['rule.section'];
      });

      return HttpResponse.json(getFindingsBsearchResponse(filteredFindings));
    }

    const hasResultEvaluationFilter =
      isArray(filter) && filter?.[0]?.match_phrase?.['result.evaluation'] !== undefined;

    if (hasResultEvaluationFilter) {
      const filteredFindings = findings.filter((finding) => {
        return finding.result.evaluation === filter?.[0]?.match_phrase?.['result.evaluation'];
      });

      return HttpResponse.json(getFindingsBsearchResponse(filteredFindings));
    }

    return HttpResponse.json(getFindingsBsearchResponse(findings));
  });
