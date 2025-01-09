/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useDatasetQualityDetailsState, useDegradedFields } from '../../../../hooks';
import { QualityIssueFieldInfo } from '../field_info';
import { PossibleDegradedFieldMitigations } from './possible_mitigations';
import { DegradedFieldInfo } from './field_info';

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function DegradedFieldFlyout() {
  const { expandedDegradedField, renderedItems } = useDegradedFields();
  const { dataStreamSettings } = useDatasetQualityDetailsState();

  const fieldList = useMemo(() => {
    return renderedItems.find((item) => {
      return item.name === expandedDegradedField?.name && item.type === expandedDegradedField?.type;
    });
  }, [renderedItems, expandedDegradedField]);

  const isUserViewingTheIssueOnLatestBackingIndex =
    dataStreamSettings?.lastBackingIndexName === fieldList?.indexFieldWasLastPresentIn;

  return (
    <>
      <QualityIssueFieldInfo fieldList={fieldList}>
        <DegradedFieldInfo />
      </QualityIssueFieldInfo>
      {isUserViewingTheIssueOnLatestBackingIndex && (
        <>
          <EuiSpacer size="s" />
          <PossibleDegradedFieldMitigations />
        </>
      )}
    </>
  );
}
