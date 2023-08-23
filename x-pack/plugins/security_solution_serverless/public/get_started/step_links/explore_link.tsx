/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback } from 'react';
import { LinkAnchor, useGetLinkProps } from '@kbn/security-solution-navigation/links';
import { SecurityPageName } from '@kbn/security-solution-navigation';

const ExploreLinkComponent = () => {
  const getLinkProps = useGetLinkProps();
  const onClick = useCallback((e) => {
    // TODO: telemetry https://github.com/elastic/kibana/issues/163247
  }, []);
  const { onClick: onLinkClicked } = getLinkProps({
    id: SecurityPageName.exploreLanding,
    onClick,
  });

  return (
    <FormattedMessage
      id="xpack.securitySolutionServerless.getStarted.togglePanel.explore.step2.description2.linkText"
      defaultMessage="Looking to start threat hunting? View the {link} to see a comprehensive overview of related security events for Host, Network, and User activity. Here key performance indicator (KPI) charts, data tables, and interactive widgets let you view specific data, drill down for deeper insights, and interact with Timeline for further investigation"
      values={{
        link: (
          <LinkAnchor id={SecurityPageName.exploreLanding} onClick={onLinkClicked}>
            <FormattedMessage
              id="xpack.securitySolutionServerless.getStarted.togglePanel.explore.step2.description2.link"
              defaultMessage="Explore pages"
            />
          </LinkAnchor>
        ),
      }}
    />
  );
};

export const ExploreLink = React.memo(ExploreLinkComponent);
