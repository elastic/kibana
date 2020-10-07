/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSpacer, EuiText, EuiFlexItem } from '@elastic/eui';

import * as i18n from './translations';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { MatrixHistogram } from '../../../../common/components/matrix_histogram';
import { MatrixHistogramType } from '../../../../../common/search_strategy/security_solution';
import {
  MatrixHistogramOption,
  MatrixHistogramConfigs,
} from '../../../../common/components/matrix_histogram/types';
import { ESQueryStringQuery } from '../../../../../common/typed_json';

const ID = 'nonEqlRuleQueryPreviewHistogramQuery';

const stackByOptions: MatrixHistogramOption[] = [
  {
    text: 'event.category',
    value: 'event.category',
  },
];
const DEFAULT_STACK_BY = 'event.category';

const histogramConfigs: MatrixHistogramConfigs = {
  defaultStackByOption:
    stackByOptions.find((o) => o.text === DEFAULT_STACK_BY) ?? stackByOptions[0],
  errorMessage: i18n.PREVIEW_QUERY_ERROR,
  histogramType: MatrixHistogramType.events,
  stackByOptions,
  title: i18n.QUERY_GRAPH_HITS_TITLE,
  titleSize: 'xs',
  subtitle: i18n.QUERY_PREVIEW_TITLE,
  hideHistogramIfEmpty: false,
};

interface PreviewNonEqlQueryHistogramProps {
  to: string;
  from: string;
  index: string[];
  filterQuery: ESQueryStringQuery | undefined;
}

export const PreviewNonEqlQueryHistogram = ({
  index,
  from,
  to,
  filterQuery,
}: PreviewNonEqlQueryHistogramProps) => {
  const { setQuery } = useGlobalTime();

  return (
    <MatrixHistogram
      endDate={from}
      filterQuery={filterQuery}
      id={ID}
      indexNames={index}
      setQuery={setQuery}
      startDate={to}
      panelHeight={328}
      yTitle={i18n.QUERY_GRAPH_COUNT}
      footerChildren={
        <EuiFlexItem grow={false}>
          <>
            <EuiSpacer />
            <EuiText size="s" color="subdued">
              <p>{i18n.PREVIEW_QUERY_DISCLAIMER}</p>
            </EuiText>
          </>
        </EuiFlexItem>
      }
      {...histogramConfigs}
    />
  );
};
