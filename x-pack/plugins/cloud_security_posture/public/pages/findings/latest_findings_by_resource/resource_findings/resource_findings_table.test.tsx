/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import * as TEST_SUBJECTS from '../../test_subjects';
import { ResourceFindingsTable, ResourceFindingsTableProps } from './resource_findings_table';
import { TestProvider } from '../../../../test/test_provider';

import Chance from 'chance';
import { CspFinding } from '../../../../../common/schemas/csp_finding';
import { EcsEvent } from '@kbn/ecs';
import { capitalize } from 'lodash';
import moment from 'moment';

const chance = new Chance();

const getFakeFindings = (): CspFinding & { id: string } => ({
  cluster_id: chance.guid(),
  id: chance.word(),
  result: {
    expected: {
      source: {},
    },
    evaluation: chance.weighted(['passed', 'failed'], [0.5, 0.5]),
    evidence: {
      filemode: chance.word(),
    },
  },
  rule: {
    audit: chance.paragraph(),
    benchmark: {
      name: 'CIS Kubernetes',
      version: '1.6.0',
      id: 'cis_k8s',
    },
    default_value: chance.sentence(),
    description: chance.paragraph(),
    id: chance.guid(),
    impact: chance.word(),
    name: chance.string(),
    profile_applicability: chance.sentence(),
    rationale: chance.paragraph(),
    references: chance.paragraph(),
    rego_rule_id: 'cis_X_X_X',
    remediation: chance.word(),
    section: chance.sentence(),
    tags: [],
    version: '1.0',
  },
  agent: {
    id: chance.string(),
    name: chance.string(),
    type: chance.string(),
    version: chance.string(),
  },
  resource: {
    name: chance.string(),
    type: chance.string(),
    raw: {} as any,
    sub_type: chance.string(),
    id: chance.string(),
  },
  host: {} as any,
  ecs: {} as any,
  event: {} as EcsEvent,
  '@timestamp': new Date().toISOString(),
});

describe('<ResourceFindingsTable />', () => {
  it('should render no findings empty state when status success and data has a length of zero ', async () => {
    const resourceFindingsProps: ResourceFindingsTableProps = {
      loading: false,
      items: [],
      pagination: { pageIndex: 0, pageSize: 10, totalItemCount: 0 },
      sorting: {
        sort: { field: '@timestamp', direction: 'desc' },
      },
      setTableOptions: jest.fn(),
      onAddFilter: jest.fn(),
    };

    render(
      <TestProvider>
        <ResourceFindingsTable {...resourceFindingsProps} />
      </TestProvider>
    );

    expect(
      screen.getByTestId(TEST_SUBJECTS.RESOURCES_FINDINGS_TABLE_EMPTY_STATE)
    ).toBeInTheDocument();
  });

  it('should render resource finding table content when data items exists', () => {
    const data = Array.from({ length: 10 }, getFakeFindings);

    const props: ResourceFindingsTableProps = {
      loading: false,
      items: data,
      pagination: { pageIndex: 0, pageSize: 10, totalItemCount: 0 },
      sorting: {
        sort: { field: 'cluster_id', direction: 'desc' },
      },
      setTableOptions: jest.fn(),
      onAddFilter: jest.fn(),
    };

    render(
      <TestProvider>
        <ResourceFindingsTable {...props} />
      </TestProvider>
    );

    data.forEach((item, i) => {
      const row = screen.getByTestId(
        TEST_SUBJECTS.getResourceFindingsTableRowTestId(item.resource.id)
      );
      const { evaluation } = item.result;
      const evaluationStatusText = capitalize(
        item.result.evaluation.slice(0, evaluation.length - 2)
      );

      expect(row).toBeInTheDocument();
      expect(within(row).queryByText(item.rule.name)).toBeInTheDocument();
      expect(within(row).queryByText(evaluationStatusText)).toBeInTheDocument();
      expect(within(row).queryByText(moment(item['@timestamp']).fromNow())).toBeInTheDocument();
      expect(within(row).queryByText(item.rule.section)).toBeInTheDocument();
    });
  });
});
