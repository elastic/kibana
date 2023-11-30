/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';

export const SLO_CARD_VIEW_PER_ROW_SIZE = 'slo-card-view-per-row-size';

export function CardsPerRow({
  setCardsPerRow,
}: {
  setCardsPerRow: (cardsPerRow?: string) => void;
}) {
  const [value, setValue] = useLocalStorage(SLO_CARD_VIEW_PER_ROW_SIZE, '3');

  useEffect(() => {
    setCardsPerRow(value);
  }, [setCardsPerRow, value]);

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
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </EuiFormRow>
  );
}
