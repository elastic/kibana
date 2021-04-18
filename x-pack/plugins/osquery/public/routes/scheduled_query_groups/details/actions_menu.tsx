/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiContextMenuPanel, EuiContextMenuItem, EuiPopover } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { useDiscoverLink } from '../../../common/hooks';

interface LiveQueryDetailsActionsMenuProps {
  actionId: string;
}

const LiveQueryDetailsActionsMenuComponent: React.FC<LiveQueryDetailsActionsMenuProps> = ({
  actionId,
}) => {
  const discoverLinkProps = useDiscoverLink({ filters: [{ key: 'action_id', value: actionId }] });
  const [isPopoverOpen, setPopover] = useState(false);

  const onButtonClick = useCallback(() => {
    setPopover((currentIsPopoverOpen) => !currentIsPopoverOpen);
  }, []);

  const closePopover = useCallback(() => {
    setPopover(false);
  }, []);

  const items = useMemo(
    () => [
      <EuiContextMenuItem key="copy" icon="copy" {...discoverLinkProps}>
        <FormattedMessage
          id="xpack.osquery.liveQueryResults.viewResultsInDiscoverLabel"
          defaultMessage="View results in Discover"
        />
      </EuiContextMenuItem>,
    ],
    [discoverLinkProps]
  );

  const button = useMemo(
    () => (
      <EuiButton iconType="arrowDown" iconSide="right" onClick={onButtonClick}>
        <FormattedMessage
          id="xpack.osquery.liveQueryResults.actionsMenuButtonLabel"
          defaultMessage="Actions"
        />
      </EuiButton>
    ),
    [onButtonClick]
  );

  return (
    <EuiPopover
      id="liveQueryDetailsActionsMenu"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel size="s" items={items} />
    </EuiPopover>
  );
};

export const LiveQueryDetailsActionsMenu = React.memo(LiveQueryDetailsActionsMenuComponent);
