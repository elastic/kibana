/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
  EuiTextColor,
} from '@elastic/eui';
import { useDatasetQualityDetailsState, useDegradedFields } from '../../../hooks';
import {
  degradedFieldMessageIssueDoesNotExistInLatestIndex,
  fieldIgnoredText,
  overviewDegradedFieldsSectionTitle,
} from '../../../../common/translations';
import { DegradedFieldInfo } from './field_info';

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function DegradedFieldFlyout() {
  const { closeDegradedFieldFlyout, expandedDegradedField, renderedItems } = useDegradedFields();
  const { dataStreamSettings } = useDatasetQualityDetailsState();
  const pushedFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'pushedFlyoutTitle',
  });

  const fieldList = useMemo(() => {
    return renderedItems.find((item) => {
      return item.name === expandedDegradedField;
    });
  }, [renderedItems, expandedDegradedField]);

  const isUserViewingTheIssueOnLatestBackingIndex =
    dataStreamSettings?.lastBackingIndexName === fieldList?.indexFieldWasLastPresentIn;

  return (
    <EuiFlyout
      type="push"
      size="s"
      onClose={closeDegradedFieldFlyout}
      aria-labelledby={pushedFlyoutTitleId}
      data-test-subj={'datasetQualityDetailsDegradedFieldFlyout'}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiBadge color="warning">{overviewDegradedFieldsSectionTitle}</EuiBadge>
        <EuiSpacer size="s" />
        <EuiTitle size="m">
          <EuiText>
            {expandedDegradedField} <span style={{ fontWeight: 400 }}>{fieldIgnoredText}</span>
          </EuiText>
        </EuiTitle>
        {!isUserViewingTheIssueOnLatestBackingIndex && (
          <>
            <EuiSpacer size="s" />
            <EuiTextColor color="danger">
              {degradedFieldMessageIssueDoesNotExistInLatestIndex}
            </EuiTextColor>
          </>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <DegradedFieldInfo fieldList={fieldList} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
