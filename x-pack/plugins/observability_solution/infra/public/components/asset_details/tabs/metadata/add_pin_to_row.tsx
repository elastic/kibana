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
  onPinned: Dispatch<React.SetStateAction<Array<Field['name']> | undefined>>;
}

const PIN_FIELD = i18n.translate('xpack.infra.metadataEmbeddable.pinField', {
  defaultMessage: 'Pin Field',
});

export const AddMetadataPinToRow = ({
  fieldName,
  pinnedItems,
  onPinned,
}: AddMetadataPinToRowProps) => {
  const handleAddPin = () => {
    onPinned([...pinnedItems, fieldName]);
  };

  const handleRemovePin = () => {
    if (pinnedItems && pinnedItems.includes(fieldName)) {
      onPinned((pinnedItems ?? []).filter((pinName: string) => fieldName !== pinName));
    }
  };

  if (pinnedItems?.includes(fieldName)) {
    return (
      <span>
        <EuiToolTip
          content={i18n.translate('xpack.infra.metadataEmbeddable.unpinField', {
            defaultMessage: 'Unpin field',
          })}
        >
          <EuiButtonIcon
            size="s"
            color="primary"
            iconType="pinFilled"
            data-test-subj="infraAssetDetailsMetadataRemovePin"
            aria-label={i18n.translate('xpack.infra.metadata.pinAriaLabel', {
              defaultMessage: 'Pinned field',
            })}
            onClick={handleRemovePin}
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
          data-test-subj="infraAssetDetailsMetadataAddPin"
          aria-label={PIN_FIELD}
          onClick={handleAddPin}
        />
      </EuiToolTip>
    </span>
  );
};
