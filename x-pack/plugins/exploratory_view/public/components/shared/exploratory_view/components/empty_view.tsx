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
import { LOADING_VIEW } from '../series_editor/series_editor';
import { ReportViewType, SeriesUrl } from '../types';

export function EmptyView({
  loading,
  series,
  reportType,
}: {
  loading: boolean;
  series?: SeriesUrl;
  reportType: ReportViewType;
}) {
  const { dataType, reportDefinitions } = series ?? {};

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

  if (!series) {
    emptyMessage = i18n.translate('xpack.exploratoryView.expView.seriesEditor.notFound', {
      defaultMessage: 'No series found. Please add a series.',
    });
  }

  return (
    <Wrapper>
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

const Wrapper = styled.div`
  text-align: center;
  position: relative;
`;

const FlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;

export const EMPTY_LABEL = i18n.translate('xpack.exploratoryView.expView.seriesBuilder.emptyview', {
  defaultMessage: 'Nothing to display.',
});

export const CHOOSE_REPORT_DEFINITION = i18n.translate(
  'xpack.exploratoryView.expView.seriesBuilder.emptyReportDefinition',
  {
    defaultMessage: 'Select a report definition to create a visualization.',
  }
);

export const SELECT_REPORT_TYPE_BELOW = i18n.translate(
  'xpack.exploratoryView.expView.seriesBuilder.selectReportType.empty',
  {
    defaultMessage: 'Select a report type to create a visualization.',
  }
);

const SELECTED_DATA_TYPE_FOR_REPORT = i18n.translate(
  'xpack.exploratoryView.expView.reportType.selectDataType',
  { defaultMessage: 'Select a data type to create a visualization.' }
);
