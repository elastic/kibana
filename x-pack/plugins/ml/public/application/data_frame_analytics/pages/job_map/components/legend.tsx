/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroupItem,
  EuiListGroup,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { JOB_MAP_NODE_TYPES } from '@kbn/ml-data-frame-analytics-utils';
import type { EuiThemeType } from '../../../../components/color_range_legend';

const getJobTypeList = () => (
  <>
    <EuiListGroup flush>
      <EuiListGroupItem iconType="outlierDetectionJob" label="Outlier detection" size="xs" />

      <EuiListGroupItem iconType="regressionJob" label="Regression" size="xs" />

      <EuiListGroupItem iconType="classificationJob" label="Classification" size="xs" />
    </EuiListGroup>
  </>
);

export const JobMapLegend: FC<{ hasMissingJobNode: boolean; theme: EuiThemeType }> = ({
  hasMissingJobNode,
  theme,
}) => {
  const [showJobTypes, setShowJobTypes] = useState<boolean>(false);
  const {
    euiSizeM,
    euiSizeS,
    euiColorGhost,
    euiColorWarning,
    euiBorderThin,
    euiBorderRadius,
    euiBorderRadiusSmall,
    euiBorderWidthThick,
  } = theme;

  return (
    <EuiFlexGroup alignItems="center" data-test-subj="mlPageDataFrameAnalyticsMapLegend">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <span
              data-test-subj="mlJobMapLegend__sourceNode"
              css={{
                height: `${euiSizeM}`,
                width: `${euiSizeM}`,
                backgroundColor: `${euiColorWarning}`,
                border: `${euiBorderThin}`,
                borderRadius: `${euiBorderRadius}`,
                display: 'inline-block',
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.ml.dataframe.analyticsMap.legend.rootNodeLabel"
                defaultMessage="source node"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <span
              data-test-subj="mlJobMapLegend__indexPattern"
              css={{
                height: `${euiSizeM}`,
                width: `${euiSizeM}`,
                backgroundColor: `${euiColorGhost}`,
                border: `${euiBorderWidthThick} solid ${theme.euiColorVis2}`,
                transform: 'rotate(45deg)',
                display: 'inline-block',
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.ml.dataframe.analyticsMap.legend.indexLabel"
                defaultMessage="index"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <span
              data-test-subj="mlJobMapLegend__ingestPipeline"
              css={{
                height: `${euiSizeM}`,
                width: `${euiSizeM}`,
                backgroundColor: `${euiColorGhost}`,
                border: `${euiBorderWidthThick} solid ${theme.euiColorVis7}`,
                borderRadius: `${euiBorderRadiusSmall}`,
                display: 'inline-block',
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.ml.dataframe.analyticsMap.legend.ingestPipelineLabel"
                defaultMessage="ingest pipeline"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <span
              data-test-subj="mlJobMapLegend__transform"
              css={{
                height: `${euiSizeM}`,
                width: `${euiSizeM}`,
                backgroundColor: `${euiColorGhost}`,
                border: `${euiBorderWidthThick} solid ${theme.euiColorVis1}`,
                display: 'inline-block',
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {JOB_MAP_NODE_TYPES.TRANSFORM}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <span
              style={{
                display: 'inline-block',
                width: '0px',
                height: '0px',
                borderLeft: `${euiSizeS} solid ${theme.euiPageBackgroundColor}`,
                borderRight: `${euiSizeS} solid ${theme.euiPageBackgroundColor}`,
                borderBottom: `${euiSizeM} solid ${theme.euiColorVis3}`,
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.ml.dataframe.analyticsMap.legend.trainedModelLabel"
                defaultMessage="trained model"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {hasMissingJobNode ? (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <span
                data-test-subj="mlJobMapLegend__analyticsMissing"
                css={{
                  height: `${euiSizeM}`,
                  width: `${euiSizeM}`,
                  backgroundColor: `${euiColorGhost}`,
                  border: `${euiBorderWidthThick} solid ${theme.euiColorFullShade}`,
                  borderRadius: '50%',
                  display: 'inline-block',
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.ml.dataframe.analyticsMap.legend.missingAnalyticsJobLabel"
                  defaultMessage="missing analytics job"
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <span
              data-test-subj="mlJobMapLegend__analytics"
              css={{
                height: `${euiSizeM}`,
                width: `${euiSizeM}`,
                backgroundColor: `${euiColorGhost}`,
                border: `${euiBorderWidthThick} solid ${theme.euiColorVis0}`,
                borderRadius: '50%',
                display: 'inline-block',
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="xpack.ml.dataframe.analyticsMap.legend.analyticsJobLabel"
                    defaultMessage="analytics jobs"
                  />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiPopover
                  ownFocus
                  button={
                    <EuiButtonIcon
                      iconSize="s"
                      onClick={() => setShowJobTypes(!showJobTypes)}
                      iconType={showJobTypes ? 'arrowUp' : 'arrowDown'}
                      aria-label={i18n.translate(
                        'xpack.ml.dataframe.analyticsMap.legend.showJobTypesAriaLabel',
                        {
                          defaultMessage: 'Show job types',
                        }
                      )}
                    />
                  }
                  isOpen={showJobTypes}
                  closePopover={() => setShowJobTypes(false)}
                >
                  {getJobTypeList()}
                </EuiPopover>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
