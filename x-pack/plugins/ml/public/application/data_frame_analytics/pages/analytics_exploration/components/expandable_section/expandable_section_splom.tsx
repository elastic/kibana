/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';

import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';

import { ScatterplotMatrix } from '../../../../../components/scatterplot_matrix';

import { DataFrameAnalyticsListRow } from '../../../analytics_management/components/analytics_list/common';

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
  fields: string[];
  index: string;
  resultsField?: string;
}

export const ExpandableSectionSplom: FC<ExpandableSectionSplomProps> = (props) => {
  const splomSectionHeaderItems = undefined; // getSplomSectionHeaderItems(splom);
  const splomSectionContent = (
    <>
      <EuiHorizontalRule size="full" margin="none" />
      <div style={{ padding: '16px' }}>
        <ScatterplotMatrix {...props} />
      </div>
    </>
  );

  return (
    <>
      <ExpandableSection
        dataTestId="splom"
        urlStateKey="splom"
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
