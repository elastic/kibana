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

const RulesManagementLinkComponent = () => {
  const getLinkProps = useGetLinkProps();
  const onClick = useCallback((e) => {
    // TODO: telemetry https://github.com/elastic/kibana/issues/163247
  }, []);
  const { onClick: onLinkClicked } = getLinkProps({
    id: SecurityPageName.rules,
    onClick,
  });
  return (
    <FormattedMessage
      id="xpack.securitySolutionServerless.getStarted.togglePanel.configure.step4.description2.linkText"
      defaultMessage="Visit the {link} to enable Elastic prebuild rules or create your own!"
      values={{
        link: (
          <LinkAnchor onClick={onLinkClicked} id={SecurityPageName.rules}>
            <FormattedMessage
              id="xpack.securitySolutionServerless.getStarted.togglePanel.configure.step4.description2.link"
              defaultMessage="rule management page"
            />
          </LinkAnchor>
        ),
      }}
    />
  );
};

export const RulesManagementLink = React.memo(RulesManagementLinkComponent);
