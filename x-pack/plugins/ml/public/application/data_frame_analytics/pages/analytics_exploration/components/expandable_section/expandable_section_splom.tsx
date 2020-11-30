/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState, FC } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';

import { EuiHorizontalRule, EuiLoadingSpinner, EuiSpacer, EuiText } from '@elastic/eui';

import type { SearchResponse7 } from '../../../../../../../common/types/es_client';

import { getProcessedFields } from '../../../../../components/data_grid';

import { ml } from '../../../../../services/ml_api_service';

import { DataFrameAnalyticsListRow } from '../../../analytics_management/components/analytics_list/common';
import { ScatterplotMatrix } from '../outlier_exploration/scatterplot_matrix';

import {
  ExpandableSection,
  ExpandableSectionProps,
  HEADER_ITEMS_LOADING,
} from './expandable_section';

const getSplomSectionHeaderItems = (
  expandedRowItem: DataFrameAnalyticsListRow | undefined
): ExpandableSectionProps['headerItems'] => {
  if (expandedRowItem === undefined) {
    return HEADER_ITEMS_LOADING;
  }

  const sourceIndex = Array.isArray(expandedRowItem.config.source.index)
    ? expandedRowItem.config.source.index.join()
    : expandedRowItem.config.source.index;

  return [
    {
      id: 'analysisTypeLabel',
      label: (
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.exploration.analysisTypeLabel"
          defaultMessage="Type"
        />
      ),
      value: expandedRowItem.job_type,
    },
    {
      id: 'analysisSourceIndexLabel',
      label: (
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.exploration.analysisSourceIndexLabel"
          defaultMessage="Source index"
        />
      ),
      value: sourceIndex,
    },
    {
      id: 'analysisDestinationIndexLabel',
      label: (
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.exploration.analysisDestinationIndexLabel"
          defaultMessage="Destination index"
        />
      ),
      value: expandedRowItem.config.dest.index,
    },
  ];
};

interface ExpandableSectionSplomProps {
  jobId: string;
}

export const ExpandableSectionSplom: FC<ExpandableSectionSplomProps> = ({ jobId }) => {
  const [splom, setSplom] = useState<object | undefined>();

  const fetchStats = async (options: { didCancel: boolean }) => {
    const analyticsConfigs = await ml.dataFrameAnalytics.getDataFrameAnalytics(jobId);

    const jobConfig = analyticsConfigs.data_frame_analytics[0];

    if (jobConfig === undefined) {
      return;
    }

    const analyzedFields = jobConfig.analyzed_fields.includes;
    try {
      const resp: SearchResponse7 = await ml.esSearch({
        index: jobConfig.dest.index,
        body: {
          fields: [...analyzedFields, 'ml.outlier_score'],
          _source: false,
          query: { match_all: {} },
          from: 0,
          size: 1000,
        },
      });

      if (!options.didCancel) {
        // setSplom(newExpandedRowItem);
        const items = resp.hits.hits.map((d) =>
          getProcessedFields(d.fields, (key: string) =>
            key.startsWith(`${jobConfig.dest.results_field}.feature_importance`)
          )
        );

        setSplom({ columns: analyzedFields, items });
      }
    } catch (e) {
      // silent catch
    }
  };

  useEffect(() => {
    const options = { didCancel: false };
    fetchStats(options);
    return () => {
      options.didCancel = true;
    };
  }, [jobId]);

  if (splom === undefined) {
    return null;
  }

  const splomSectionHeaderItems = undefined; // getSplomSectionHeaderItems(splom);
  const splomSectionContent = (
    <>
      <EuiHorizontalRule size="full" margin="none" />
      {splom === undefined && (
        <EuiText textAlign="center">
          <EuiSpacer size="l" />
          <EuiLoadingSpinner size="l" />
          <EuiSpacer size="l" />
        </EuiText>
      )}
      {splom !== undefined && <ScatterplotMatrix {...splom} />}
    </>
  );

  return (
    <>
      <ExpandableSection
        dataTestId="splom"
        content={splomSectionContent}
        headerItems={splomSectionHeaderItems}
        isExpanded={true}
        title={
          <FormattedMessage
            id="xpack.ml.dataframe.analytics.exploration.splomSectionTitle"
            defaultMessage="Scatterplot Matrix"
          />
        }
      />
      <EuiSpacer size="m" />
    </>
  );
};
