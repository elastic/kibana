/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { TimeRange } from '@kbn/es-query';
import { FieldPath } from 'react-hook-form';
import { SearchBarProps } from './query_builder';
import { CreateSLOForm } from '../../types';
import { DocumentsTable } from './documents_table';

export function QueryDocumentsFlyout({
  setRange,
  name,
  range,
  dataView,
  searchBarProps,
  setIsFlyoutOpen,
}: {
  range: TimeRange;
  setRange: (range: TimeRange) => void;
  dataView: DataView;
  searchBarProps: SearchBarProps;
  setIsFlyoutOpen: (value: boolean) => void;
  name: FieldPath<CreateSLOForm>;
}) {
  return (
    <EuiFlyoutResizable
      onClose={() => setIsFlyoutOpen(false)}
      size="1050px"
      minWidth={500}
      maxWidth={1200}
    >
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('xpack.slo.queryBuilder.h2.documentsLabel', {
              defaultMessage: 'Documents for {indexPattern}',
              values: { indexPattern: dataView.getIndexPattern() },
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {dataView && (
          <DocumentsTable
            dataView={dataView}
            searchBarProps={searchBarProps}
            range={range}
            setRange={setRange}
            name={name}
          />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButton
          data-test-subj="o11yQueryBuilderCloseButton"
          onClick={() => setIsFlyoutOpen(false)}
        >
          {i18n.translate('xpack.slo.queryBuilder.closeButtonLabel', {
            defaultMessage: 'Close',
          })}
        </EuiButton>
      </EuiFlyoutFooter>
    </EuiFlyoutResizable>
  );
}
