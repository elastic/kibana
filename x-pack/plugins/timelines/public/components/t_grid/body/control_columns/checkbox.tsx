/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCheckbox, EuiLoadingSpinner } from '@elastic/eui';
import React, { useCallback } from 'react';
import { ALERT_RULE_PRODUCER } from '@kbn/rule-data-utils';
import type { ActionProps, HeaderActionProps } from '../../../../../common/types';
import * as i18n from './translations';

export const RowCheckBox = ({
  eventId,
  onRowSelected,
  checked,
  ariaRowindex,
  columnValues,
  disabled,
  loadingEventIds,
  data,
}: ActionProps) => {
  const ruleProducers = data.find((d) => d.field === ALERT_RULE_PRODUCER)?.value ?? [];
  const ruleProducer = ruleProducers[0];
  const handleSelectEvent = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!disabled) {
        onRowSelected({
          eventIds: [eventId],
          isSelected: event.currentTarget.checked,
        });
      }
    },
    [eventId, onRowSelected, disabled]
  );

  return loadingEventIds.includes(eventId) ? (
    <EuiLoadingSpinner size="m" data-test-subj="event-loader" />
  ) : (
    <EuiCheckbox
      data-test-subj={`select-event select-event-rule-producer-${ruleProducer}`}
      id={eventId}
      checked={checked && !disabled}
      disabled={disabled}
      onChange={handleSelectEvent}
      aria-label={i18n.CHECKBOX_FOR_ROW({ ariaRowindex, columnValues, checked })}
    />
  );
};

export const HeaderCheckBox = ({ onSelectAll, isSelectAllChecked }: HeaderActionProps) => {
  const handleSelectPageChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSelectAll({ isSelected: event.currentTarget.checked });
    },
    [onSelectAll]
  );

  return (
    <EuiCheckbox
      data-test-subj="select-all-events"
      id="select-all-events"
      checked={isSelectAllChecked}
      onChange={handleSelectPageChange}
    />
  );
};
