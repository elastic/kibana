/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiContextMenuPanel, EuiContextMenuItem, EuiPopover } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { useKibana } from '../../../common/lib/kibana';

interface LiveQueryDetailsActionsMenuProps {
  actionId: string;
}

const LiveQueryDetailsActionsMenuComponent: React.FC<LiveQueryDetailsActionsMenuProps> = ({
  actionId,
}) => {
  const services = useKibana().services;
  const [isPopoverOpen, setPopover] = useState(false);

  const discoverLinkHref = services?.application?.getUrlForApp('discover', {
    path: `#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-24h,to:now))&_a=(columns:!(),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'logs-*',key:action_id,negate:!f,params:(query:'${actionId}'),type:phrase),query:(match_phrase:(action_id:'${actionId}')))),index:'logs-*',interval:auto,query:(language:kuery,query:''),sort:!(!('@timestamp',desc)))`,
  });

  const onButtonClick = useCallback(() => {
    setPopover((currentIsPopoverOpen) => !currentIsPopoverOpen);
  }, []);

  const closePopover = useCallback(() => {
    setPopover(false);
  }, []);

  const items = useMemo(
    () => [
      <EuiContextMenuItem key="copy" icon="copy" href={discoverLinkHref}>
        Check results in Discover
      </EuiContextMenuItem>,
    ],
    [discoverLinkHref]
  );

  const button = (
    <EuiButton iconType="arrowDown" iconSide="right" onClick={onButtonClick}>
      Actions
    </EuiButton>
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
