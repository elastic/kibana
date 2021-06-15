/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiText, EuiCheckableCard, EuiTextColor, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const txtUnknown = i18n.translate('xpack.uiActionsEnhanced.components.TriggerPickerItem.unknown', {
  defaultMessage: 'Unknown',
});

export interface TriggerPickerItemDescription {
  id: string;
  title?: string;
  description?: string;
}

export interface TriggerPickerItemProps extends TriggerPickerItemDescription {
  /** Whether the item is selected. */
  checked?: boolean;

  /** Whether to disable user interaction. */
  disabled?: boolean;

  /** Called when item is selected by user. */
  onSelect: (id: string) => void;
}

export const TriggerPickerItem: React.FC<TriggerPickerItemProps> = ({
  id,
  title = txtUnknown,
  description,
  checked,
  disabled,
  onSelect,
}) => {
  const descriptionFragment = !!description && (
    <div>
      <EuiText size={'s'}>
        <EuiTextColor color={'subdued'}>{description}</EuiTextColor>
      </EuiText>
    </div>
  );

  const label = (
    <>
      <EuiTitle size={'xxs'}>
        <span>{title}</span>
      </EuiTitle>
      {descriptionFragment}
    </>
  );

  return (
    <>
      <EuiCheckableCard
        id={id}
        label={label}
        name={id}
        value={id}
        checked={checked}
        disabled={disabled}
        onChange={() => onSelect(id)}
        data-test-subj={`triggerPicker-${id}`}
      />
      <EuiSpacer size={'s'} />
    </>
  );
};
