/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

const previousPageLabel = i18n.translate(
  'xpack.infra.logs.analysis.anomaliesTablePreviousPageLabel',
  {
    defaultMessage: 'Previous page',
  }
);

const nextPageLabel = i18n.translate('xpack.infra.logs.analysis.anomaliesTableNextPageLabel', {
  defaultMessage: 'Next page',
});

export const PaginationControls = ({
  fetchPreviousPage,
  fetchNextPage,
  page,
  isLoading,
}: {
  fetchPreviousPage?: () => void;
  fetchNextPage?: () => void;
  page: number;
  isLoading: boolean;
}) => {
  return (
    <EuiFlexGroup justifyContent="center">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup>
          <EuiButtonIcon
            iconType="arrowLeft"
            isDisabled={!fetchPreviousPage || isLoading}
            onClick={fetchPreviousPage}
            aria-label={previousPageLabel}
          />
          <span>
            <strong>{page}</strong>
          </span>
          <EuiButtonIcon
            iconType="arrowRight"
            isDisabled={!fetchNextPage || isLoading}
            onClick={fetchNextPage}
            aria-label={nextPageLabel}
          />
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
