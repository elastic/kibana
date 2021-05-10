/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isEmpty } from 'lodash';
import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiSpacer, EuiText } from '@elastic/eui';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { LOADING_VIEW } from '../series_builder/series_builder';
import { SeriesUrl } from '../types';

export function EmptyView({
  loading,
  height,
  series,
}: {
  loading: boolean;
  height: string;
  series: SeriesUrl;
}) {
  const { dataType, reportType, reportDefinitions } = series ?? {};

  let emptyMessage = EMPTY_LABEL;

  if (dataType) {
    if (reportType) {
      if (isEmpty(reportDefinitions)) {
        emptyMessage = CHOOSE_REPORT_DEFINITION;
      }
    } else {
      emptyMessage = SELECT_REPORT_TYPE_BELOW;
    }
  } else {
    emptyMessage = SELECTED_DATA_TYPE_FOR_REPORT;
  }

  return (
    <Wrapper height={height}>
      {loading && (
        <EuiProgress
          size="xs"
          color="accent"
          position="absolute"
          style={{
            top: 'initial',
          }}
        />
      )}
      <EuiSpacer />
      <FlexGroup justifyContent="center" alignItems="center">
        <EuiFlexItem>
          <EuiText>{loading ? LOADING_VIEW : emptyMessage}</EuiText>
        </EuiFlexItem>
      </FlexGroup>
    </Wrapper>
  );
}

const Wrapper = styled.div<{ height: string }>`
  text-align: center;
  height: ${(props) => props.height};
  position: relative;
`;

const FlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;

export const EMPTY_LABEL = i18n.translate('xpack.observability.expView.seriesBuilder.emptyview', {
  defaultMessage: 'Nothing to display.',
});

export const CHOOSE_REPORT_DEFINITION = i18n.translate(
  'xpack.observability.expView.seriesBuilder.emptyReportDefinition',
  {
    defaultMessage: 'Select a report type to create a visualization.',
  }
);

export const SELECT_REPORT_TYPE_BELOW = i18n.translate(
  'xpack.observability.expView.seriesBuilder.selectReportType.empty',
  {
    defaultMessage: 'Select a report type to create a visualization.',
  }
);

const SELECTED_DATA_TYPE_FOR_REPORT = i18n.translate(
  'xpack.observability.expView.reportType.selectDataType',
  { defaultMessage: 'Select a data type to create a visualization.' }
);
