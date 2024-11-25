/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useBoolean } from '@kbn/react-hooks';

interface Props {
  discoverUrl: string;
  entityIdentifyingValue?: string;
}

export const EntityActions = ({ discoverUrl, entityIdentifyingValue }: Props) => {
  const [isPopoverOpen, { toggle: togglePopover, off: closePopover }] = useBoolean(false);
  const actionButtonTestSubject = entityIdentifyingValue
    ? `inventoryEntityActionsButton-${entityIdentifyingValue}`
    : 'inventoryEntityActionsButton';

  const actions = [
    <EuiContextMenuItem
      data-test-subj="inventoryEntityActionOpenInDiscover"
      key={`openInDiscover-${entityIdentifyingValue}`}
      color="text"
      icon="discoverApp"
      href={discoverUrl}
    >
      {i18n.translate('xpack.inventory.entityActions.discoverLink', {
        defaultMessage: 'Open in discover',
      })}
    </EuiContextMenuItem>,
  ];

  return (
    <>
      <EuiPopover
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
        anchorPosition="upCenter"
        button={
          <EuiButtonIcon
            data-test-subj={actionButtonTestSubject}
            aria-label={i18n.translate(
              'xpack.inventory.entityActions.euiButtonIcon.showActionsLabel',
              { defaultMessage: 'Show actions' }
            )}
            iconType="boxesHorizontal"
            color="text"
            onClick={togglePopover}
          />
        }
        closePopover={closePopover}
      >
        <EuiContextMenuPanel items={actions} size="s" />
      </EuiPopover>
    </>
  );
};
