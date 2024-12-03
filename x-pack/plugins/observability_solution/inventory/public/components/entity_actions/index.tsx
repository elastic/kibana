/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { type SetStateAction } from 'react';
import { useBoolean } from '@kbn/react-hooks';
import type { Dispatch } from '@kbn/kibana-utils-plugin/common';
import type { InventoryEntity } from '../../../common/entities';
import { useDiscoverRedirect } from '../../hooks/use_discover_redirect';

interface Props {
  entity: InventoryEntity;
  setShowActions: Dispatch<SetStateAction<boolean>>;
}

export const EntityActions = ({ entity, setShowActions }: Props) => {
  const [isPopoverOpen, { toggle: togglePopover, off: closePopover }] = useBoolean(false);
  const actionButtonTestSubject = entity.entityDisplayName
    ? `inventoryEntityActionsButton-${entity.entityDisplayName}`
    : 'inventoryEntityActionsButton';

  const { getDiscoverEntitiesRedirectUrl, isEntityDefinitionLoading } = useDiscoverRedirect(entity);
  const discoverUrl = getDiscoverEntitiesRedirectUrl();

  const actions: React.ReactElement[] = [];

  if (!discoverUrl && !isEntityDefinitionLoading) {
    setShowActions(false);
    return null;
  }

  if (!isEntityDefinitionLoading) {
    actions.push(
      <EuiContextMenuItem
        data-test-subj="inventoryEntityActionExploreInDiscover"
        key={`exploreInDiscover-${entity.entityDisplayName}`}
        color="text"
        icon="discoverApp"
        href={discoverUrl}
      >
        {i18n.translate('xpack.inventory.entityActions.exploreInDiscoverLink', {
          defaultMessage: 'Explore in Discover',
        })}
      </EuiContextMenuItem>
    );
  }

  return (
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
          isLoading={isEntityDefinitionLoading}
        />
      }
      closePopover={closePopover}
    >
      <EuiContextMenuPanel items={actions} size="s" />
    </EuiPopover>
  );
};
