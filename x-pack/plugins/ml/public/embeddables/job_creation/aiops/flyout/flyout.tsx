/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiFlyoutBody,
  EuiTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { TimeRange } from '@kbn/es-query';
import { CreateJob } from './create_job';

interface Props {
  dataView: DataView;
  field: DataViewField;
  query: QueryDslQueryContainer;
  timeRange: TimeRange;
  onClose: () => void;
}

export const CreateCategorizationJobFlyout: FC<Props> = ({
  onClose,
  dataView,
  field,
  query,
  timeRange,
}) => {
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.ml.embeddables.newJobFromPatternAnalysisFlyout.title"
              defaultMessage="Create anomaly detection job"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <FormattedMessage
            id="xpack.ml.embeddables.newJobFromPatternAnalysisFlyout.secondTitle"
            defaultMessage="Create a categorization job for {field}"
            values={{ field: field.name }}
          />
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <CreateJob dataView={dataView} field={field} query={query} timeRange={timeRange} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.ml.embeddables.newJobFromPatternAnalysisFlyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
