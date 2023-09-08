/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import React from 'react';
import { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { Filter } from '../../../../common/custom_link/custom_link_types';
import { useFetcher } from '../../../hooks/use_fetcher';
import { convertFiltersToQuery } from '../../app/settings/custom_link/create_edit_custom_link_flyout/helper';
import { CreateEditCustomLinkFlyout } from '../../app/settings/custom_link/create_edit_custom_link_flyout';

export function CustomLinkFlyout({
  transaction,
  isOpen,
  onClose,
}: {
  transaction?: Transaction;
  isOpen: boolean;
  onClose: () => void;
}) {
  const filters = useMemo(
    () =>
      [
        { key: 'service.name', value: transaction?.service.name },
        { key: 'service.environment', value: transaction?.service.environment },
        { key: 'transaction.name', value: transaction?.transaction.name },
        { key: 'transaction.type', value: transaction?.transaction.type },
      ].filter((filter): filter is Filter => typeof filter.value === 'string'),
    [transaction]
  );

  const { refetch } = useFetcher(
    (callApmApi) =>
      callApmApi('GET /internal/apm/settings/custom_links', {
        isCachable: false,
        params: { query: convertFiltersToQuery(filters) },
      }),
    [filters]
  );

  return (
    <>
      {isOpen && (
        <CreateEditCustomLinkFlyout
          defaults={{ filters }}
          onClose={() => {
            onClose();
          }}
          onSave={() => {
            onClose();
            refetch();
          }}
          onDelete={() => {
            onClose();
            refetch();
          }}
        />
      )}
    </>
  );
}
