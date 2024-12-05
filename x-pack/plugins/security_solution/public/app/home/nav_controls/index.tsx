/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { createHtmlPortalNode, OutPortal, InPortal } from 'react-reverse-portal';

import { useNavigationContext } from '@kbn/security-solution-navigation/src/context';
import { AssistantNavLink } from '../../../assistant/nav_link';

export const NavControls = () => {
  const services = useNavigationContext();
  const portalNode = React.useMemo(() => createHtmlPortalNode(), []);

  useEffect(() => {
    const registerPortalNode = () => {
      services.chrome.navControls.registerRight({
        mount: (element: HTMLElement) => {
          ReactDOM.render(<OutPortal node={portalNode} />, element);
          return () => ReactDOM.unmountComponentAtNode(element);
        },
        // right before the user profile
        order: 1001,
      });
    };

    registerPortalNode();
  }, [portalNode, services.chrome.navControls]);

  return (
    <InPortal node={portalNode}>
      <AssistantNavLink />
    </InPortal>
  );
}
