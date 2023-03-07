/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import moment from 'moment';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { getClusterIdQuery } from './benchmarks_section';
import { CSPM_POLICY_TEMPLATE, INTERNAL_FEATURE_FLAGS } from '../../../../common/constants';
import { Cluster } from '../../../../common/types';
import { useNavigateFindings } from '../../../common/hooks/use_navigate_findings';
import { CISBenchmarkIcon } from '../../../components/cis_benchmark_icon';

const defaultClusterTitle = i18n.translate(
  'xpack.csp.dashboard.benchmarkSection.defaultClusterTitle',
  { defaultMessage: 'ID' }
);

const getClusterTitle = (cluster: Cluster) => {
  if (cluster.meta.benchmark.posture_type === CSPM_POLICY_TEMPLATE) {
    return cluster.meta.cloud?.account.name;
  }

  return cluster.meta.cluster?.name;
};

const getClusterId = (cluster: Cluster) => {
  const assetIdentifierId = cluster.meta.assetIdentifierId;
  if (cluster.meta.benchmark.posture_type === CSPM_POLICY_TEMPLATE) return assetIdentifierId;
  return assetIdentifierId.slice(0, 6);
};

export const ClusterDetailsBox = ({ cluster }: { cluster: Cluster }) => {
  const { euiTheme } = useEuiTheme();
  const navToFindings = useNavigateFindings();

  const assetId = getClusterId(cluster);
  const title = getClusterTitle(cluster) || defaultClusterTitle;

  const handleClusterTitleClick = () => {
    return navToFindings(getClusterIdQuery(cluster));
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="none" alignItems="flexStart">
      <EuiFlexItem grow={false}>
        <EuiToolTip
          position="top"
          content={
            <EuiText>
              <FormattedMessage
                id="xpack.csp.dashboard.benchmarkSection.clusterTitleTooltip.clusterPrefixTitle"
                defaultMessage="Show all findings for "
              />
              <strong>
                <FormattedMessage
                  id="xpack.csp.dashboard.benchmarkSection.clusterTitleTooltip.clusterTitle"
                  defaultMessage="{title} - {assetId}"
                  values={{
                    title,
                    assetId,
                  }}
                />
              </strong>
            </EuiText>
          }
        >
          <EuiLink onClick={handleClusterTitleClick} color="text">
            <EuiTitle css={{ fontSize: 20 }}>
              <h5>
                <FormattedMessage
                  id="xpack.csp.dashboard.benchmarkSection.clusterTitle"
                  defaultMessage="{title} - {assetId}"
                  values={{
                    title,
                    assetId,
                  }}
                />
              </h5>
            </EuiTitle>
          </EuiLink>
        </EuiToolTip>
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.csp.dashboard.benchmarkSection.lastEvaluatedTitle"
            defaultMessage="Last evaluated {dateFromNow}"
            values={{
              dateFromNow: moment(cluster.meta.lastUpdate).fromNow(),
            }}
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem
        grow={true}
        style={{ justifyContent: 'flex-end', paddingBottom: euiTheme.size.m }}
      >
        <CISBenchmarkIcon type={cluster.meta.benchmark.id} name={cluster.meta.benchmark.name} />
      </EuiFlexItem>
      {INTERNAL_FEATURE_FLAGS.showManageRulesMock && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty>
            <FormattedMessage
              id="xpack.csp.dashboard.benchmarkSection.manageRulesButton"
              defaultMessage="Manage Rules"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
