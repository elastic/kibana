/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
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
import { JOB_MAP_NODE_TYPES } from '../../../../../../common/constants/data_frame_analytics';
import { EuiThemeType } from '../../../../components/color_range_legend';

const getJobTypeList = () => (
  <>
    <EuiListGroup flush>
      <EuiListGroupItem iconType="outlierDetectionJob" label="Outlier detection" size="xs" />

      <EuiListGroupItem iconType="regressionJob" label="Regression" size="xs" />

      <EuiListGroupItem iconType="classificationJob" label="Classification" size="xs" />
    </EuiListGroup>
  </>
);

export const JobMapLegend: FC<{ theme: EuiThemeType }> = ({ theme }) => {
  const [showJobTypes, setShowJobTypes] = useState<boolean>(false);

  return (
    <EuiFlexGroup
      className="mlJobMapLegend__container"
      alignItems="center"
      data-test-subj="mlPageDataFrameAnalyticsMapLegend"
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <span className="mlJobMapLegend__sourceNode" />
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
            <span className="mlJobMapLegend__indexPattern" />
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
            <span className="mlJobMapLegend__transform" />
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
                borderLeft: `${theme.euiSizeS} solid ${theme.euiPageBackgroundColor}`,
                borderRight: `${theme.euiSizeS} solid ${theme.euiPageBackgroundColor}`,
                borderBottom: `${theme.euiSizeM} solid ${theme.euiColorVis3}`,
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
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <span className="mlJobMapLegend__analytics" />
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
