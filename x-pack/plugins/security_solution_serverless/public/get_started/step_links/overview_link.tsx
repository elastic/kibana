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
import { EXPLORE_STEP2_DESCRIPTION1 } from '../translations';

const OverviewLinkComponent = () => {
  const getLinkProps = useGetLinkProps();
  const onClick = useCallback((e) => {
    // TODO: telemetry https://github.com/elastic/kibana/issues/163247
  }, []);
  const { onClick: onLinkClicked } = getLinkProps({
    id: SecurityPageName.overview,
    onClick,
  });
  return (
    <>
      {EXPLORE_STEP2_DESCRIPTION1}
      <FormattedMessage
        id="xpack.securitySolutionServerless.getStarted.togglePanel.explore.step2.description1.linkText"
        defaultMessage="Visit the {link} now to confirm your organization is secure!"
        values={{
          link: (
            <LinkAnchor onClick={onLinkClicked} id={SecurityPageName.overview}>
              <FormattedMessage
                id="xpack.securitySolutionServerless.getStarted.togglePanel.explore.step2.description1.link"
                defaultMessage="Start here"
              />
            </LinkAnchor>
          ),
        }}
      />
    </>
  );
};

export const OverviewLink = React.memo(OverviewLinkComponent);
