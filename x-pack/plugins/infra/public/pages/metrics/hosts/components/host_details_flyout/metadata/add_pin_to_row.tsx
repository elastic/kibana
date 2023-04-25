/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Dispatch } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import type { Field } from './utils';

interface AddMetadataPinToRowProps {
  fieldName: Field['name'];
  pinnedItems: Array<Field['name']>;
  setPinnedItems: Dispatch<React.SetStateAction<Array<Field['name']> | undefined>>;
}

const PIN_FIELD = i18n.translate('xpack.infra.hostsViewPage.flyout.metadata.pinField', {
  defaultMessage: 'Pin Field',
});

export const AddMetadataPinToRow = ({
  fieldName,
  pinnedItems,
  setPinnedItems,
}: AddMetadataPinToRowProps) => {
  const handleAddPin = (pin: Field['name']) => {
    setPinnedItems([...pinnedItems, pin]);
  };

  const handleRemovePin = (pin: Field['name']) => {
    if (pinnedItems && pinnedItems.includes(pin)) {
      setPinnedItems((pinnedItems ?? []).filter((pinName: string) => pin !== pinName));
    }
  };

  if (pinnedItems?.includes(fieldName)) {
    return (
      <span>
        <EuiToolTip
          content={i18n.translate('xpack.infra.hostsViewPage.flyout.metadata.unpinField', {
            defaultMessage: 'Unpin field',
          })}
        >
          <EuiButtonIcon
            size="s"
            color="primary"
            iconType="pinFilled"
            data-test-subj="hostsView-flyout-metadata-remove-pin"
            aria-label={i18n.translate('xpack.infra.hostsViewPage.flyout.metadata.pinAriaLabel', {
              defaultMessage: 'Pinned field',
            })}
            onClick={() => handleRemovePin(fieldName)}
          />
        </EuiToolTip>
      </span>
    );
  }

  return (
    <span className="euiTableCellContent__hoverItem expandedItemActions__completelyHide">
      <EuiToolTip content={PIN_FIELD}>
        <EuiButtonIcon
          color="primary"
          size="s"
          iconType="pin"
          data-test-subj="hostsView-flyout-metadata-add-pin"
          aria-label={PIN_FIELD}
          onClick={() => handleAddPin(fieldName)}
        />
      </EuiToolTip>
    </span>
  );
};
