/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
  EuiIcon,
  EuiCode,
} from '@elastic/eui';

import { DEFAULT_TIME_RANGE, DEFAULT_DATEPICKER_REFRESH } from '../../../../common/constants';
import { flyoutDegradedDocsText } from '../../../../common/translations';
import { TimeRangeConfig } from '../../../state_machines/dataset_quality_controller';
import { DegradedDocsChart } from './degraded_docs_chart';

export function DegradedDocs({
  dataStream,
  timeRange = { ...DEFAULT_TIME_RANGE, refresh: DEFAULT_DATEPICKER_REFRESH },
  lastReloadTime,
}: {
  dataStream?: string;
  timeRange?: TimeRangeConfig;
  lastReloadTime: number;
}) {
  return (
    <EuiPanel hasBorder grow={false}>
      <EuiFlexGroup
        css={css`
          flex-grow: 1;
        `}
        justifyContent="flexStart"
        alignItems="center"
        gutterSize="xs"
      >
        <EuiTitle size="xxxs">
          <h6>{flyoutDegradedDocsText}</h6>
        </EuiTitle>
        <EuiToolTip content={degradedDocsTooltip}>
          <EuiIcon size="m" color="subdued" type="questionInCircle" className="eui-alignTop" />
        </EuiToolTip>
      </EuiFlexGroup>
      <EuiSpacer />
      <DegradedDocsChart
        dataStream={dataStream}
        timeRange={timeRange}
        lastReloadTime={lastReloadTime}
      />
    </EuiPanel>
  );
}

const degradedDocsTooltip = (
  <FormattedMessage
    id="xpack.datasetQuality.flyoutDegradedDocsTooltip"
    defaultMessage="The percentage of degraded documents —documents with the {ignoredProperty} property— in your dataset."
    values={{
      ignoredProperty: (
        <EuiCode language="json" transparentBackground>
          _ignored
        </EuiCode>
      ),
    }}
  />
);
