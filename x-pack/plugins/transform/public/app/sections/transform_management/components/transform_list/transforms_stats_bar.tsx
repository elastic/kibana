/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { TRANSFORM_MODE, TRANSFORM_STATE } from '../../../../../../common/constants';

import { TransformListRow } from '../../../../common';

import { useDocumentationLinks } from '../../../../hooks/use_documentation_links';

import { StatsBar, TransformStatsBarStats } from '../stats_bar';

function createTranformStats(transformNodes: number, transformsList: TransformListRow[]) {
  const transformStats = {
    total: {
      label: i18n.translate('xpack.transform.statsBar.totalTransformsLabel', {
        defaultMessage: 'Total transforms',
      }),
      value: 0,
      show: true,
    },
    batch: {
      label: i18n.translate('xpack.transform.statsBar.batchTransformsLabel', {
        defaultMessage: 'Batch',
      }),
      value: 0,
      show: true,
    },
    continuous: {
      label: i18n.translate('xpack.transform.statsBar.continuousTransformsLabel', {
        defaultMessage: 'Continuous',
      }),
      value: 0,
      show: true,
    },
    failed: {
      label: i18n.translate('xpack.transform.statsBar.failedTransformsLabel', {
        defaultMessage: 'Failed',
      }),
      value: 0,
      show: false,
    },
    started: {
      label: i18n.translate('xpack.transform.statsBar.startedTransformsLabel', {
        defaultMessage: 'Started',
      }),
      value: 0,
      show: true,
    },
    nodes: {
      label: i18n.translate('xpack.transform.statsBar.transformNodesLabel', {
        defaultMessage: 'Nodes',
      }),
      value: transformNodes,
      show: true,
    },
  };

  if (transformsList === undefined) {
    return transformStats;
  }

  let failedTransforms = 0;
  let startedTransforms = 0;

  transformsList.forEach((transform) => {
    if (transform.mode === TRANSFORM_MODE.CONTINUOUS) {
      transformStats.continuous.value++;
    } else if (transform.mode === TRANSFORM_MODE.BATCH) {
      transformStats.batch.value++;
    }

    if (transform.stats.state === TRANSFORM_STATE.FAILED) {
      failedTransforms++;
    } else if (transform.stats.state === TRANSFORM_STATE.STARTED) {
      startedTransforms++;
    }
  });

  transformStats.total.value = transformsList.length;
  transformStats.started.value = startedTransforms;

  if (failedTransforms !== 0) {
    transformStats.failed.value = failedTransforms;
    transformStats.failed.show = true;
  } else {
    transformStats.failed.show = false;
  }

  return transformStats;
}

interface TransformStatsBarProps {
  transformNodes: number;
  transformsList: TransformListRow[];
}

export const TransformStatsBar: FC<TransformStatsBarProps> = ({
  transformNodes,
  transformsList,
}) => {
  const { esNodeRoles } = useDocumentationLinks();

  const transformStats: TransformStatsBarStats = createTranformStats(
    transformNodes,
    transformsList
  );

  return (
    <>
      <StatsBar stats={transformStats} dataTestSub={'transformStatsBar'} />
      {transformNodes === 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.transform.transformNodes.noTransformNodesCallOutTitle"
                defaultMessage="There are no transform nodes available."
              />
            }
            color="warning"
            iconType="alert"
          >
            <p>
              <FormattedMessage
                id="xpack.transform.transformNodes.noTransformNodesCallOutBody"
                defaultMessage="You will not be able to create or run transforms. {learnMoreLink}"
                values={{
                  learnMoreLink: (
                    <EuiLink href={esNodeRoles} target="_blank">
                      <FormattedMessage
                        id="xpack.transform.transformNodes.noTransformNodesLearnMoreLinkText"
                        defaultMessage="Learn more"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiCallOut>
        </>
      )}
    </>
  );
};
