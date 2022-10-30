/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, useEuiTheme } from '@elastic/eui';
import { PartitionElementEvent } from '@elastic/charts';
import { CloudPostureScoreChart } from '../compliance_charts/cloud_posture_score_chart';
import type { ComplianceDashboardData, Evaluation } from '../../../../common/types';
import { RisksTable } from '../compliance_charts/risks_table';
import { RULE_FAILED } from '../../../../common/constants';
import { useNavigateFindings } from '../../../common/hooks/use_navigate_findings';
import { ClusterDetailsBox } from './cluster_details_box';

const cardHeight = 300;

export const CloudBenchmarksSection = ({
  complianceData,
}: {
  complianceData: ComplianceDashboardData;
}) => {
  const { euiTheme } = useEuiTheme();
  const navToFindings = useNavigateFindings();

  const handleElementClick = (clusterId: string, elements: PartitionElementEvent[]) => {
    const [element] = elements;
    const [layerValue] = element;
    const evaluation = layerValue[0].groupByRollup as Evaluation;

    navToFindings({ cluster_id: clusterId, 'result.evaluation': evaluation });
  };

  const handleCellClick = (clusterId: string, ruleSection: string) => {
    navToFindings({
      cluster_id: clusterId,
      'rule.section': ruleSection,
      'result.evaluation': RULE_FAILED,
    });
  };

  const handleViewAllClick = (clusterId: string) => {
    navToFindings({ cluster_id: clusterId, 'result.evaluation': RULE_FAILED });
  };

  const columns = [
    {
      headerCellProps: {},
      field: 'firstName',
      name: 'Cluster Name',
      width: '20%',
      render: (a, cluster) => {
        // console.log(a, b);
        return <ClusterDetailsBox cluster={cluster} />;
      },
      valign: 'top',
    },
    {
      field: 'firstName',
      name: 'Compliance Score',
      width: '40%',
      valign: 'top',

      render: (a, cluster) => {
        // console.log(a, b);
        return (
          <CloudPostureScoreChart
            trendGraphHeight={120}
            id={`${cluster.meta.clusterId}_score_chart`}
            data={cluster.stats}
            trend={cluster.trend}
            partitionOnElementClick={(elements) =>
              handleElementClick(cluster.meta.clusterId, elements)
            }
          />
        );
      },
    },
    {
      field: 'firstName',
      name: 'Compliance by CIS Section',
      width: '40%',
      valign: 'top',
      render: (a, cluster) => {
        // console.log(a, b);
        return (
          <RisksTable
            data={cluster.groupedFindingsEvaluation}
            maxItems={3}
            onCellClick={(resourceTypeName) =>
              handleCellClick(cluster.meta.clusterId, resourceTypeName)
            }
            onViewAllClick={() => handleViewAllClick(cluster.meta.clusterId)}
          />
        );
      },
    },
  ];

  return (
    <div
      css={`
        .first-table > .euiTableHeaderCell > .euiTableCellContent {
          border-bottom: 3px solid black;
        }
      `}
    >
      <EuiBasicTable
        className={'first-table'}
        css={`
          .first-table {
            .euiTableHeaderCell {
              .euiTableCellContent {
                border-bottom: 3px solid black;
              }
            }
          }
        `}
        items={complianceData.clusters}
        rowHeader="firstName"
        columns={columns}
        cellProps={{
          style: {
            borderTop: 'initial',
            padding: '0 24px',
          },
        }}
        // rowProps={{
        //   style: {
        //     borderTop: '3px solid black',
        //   },
        // }}
      />
    </div>
  );
};
