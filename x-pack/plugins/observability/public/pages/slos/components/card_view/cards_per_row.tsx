/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';

export const SLO_CARD_VIEW_PER_ROW_SIZE = 'slo-card-view-per-row-size';

export function CardsPerRow({
  setCardsPerRow,
  cardsPerRow,
}: {
  setCardsPerRow: (cardsPerRow?: string) => void;
  cardsPerRow: string;
}) {
  const options = [
    { value: '3', text: '3' },
    { value: '4', text: '4' },
  ];

  return (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.observability.gridSize.euiFormRow.itemsPerRowLabel"
          defaultMessage="Cards per row"
        />
      }
    >
      <EuiSelect
        data-test-subj="o11yGridSizeSelect"
        id={'grid-size-select'}
        options={options}
        value={cardsPerRow}
        onChange={(e) => setCardsPerRow(e.target.value)}
      />
    </EuiFormRow>
  );
}
