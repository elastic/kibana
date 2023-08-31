/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import { LinkButton, useGetLinkProps } from '@kbn/security-solution-navigation/links';
import { SecurityPageName } from '@kbn/security-solution-navigation';

import React, { useCallback } from 'react';

const AlertsButtonComponent = () => {
  const getLinkProps = useGetLinkProps();
  const onClick = useCallback((e) => {
    // TODO: telemetry https://github.com/elastic/kibana/issues/163247
  }, []);
  const { onClick: onLinkClicked } = getLinkProps({
    id: SecurityPageName.alerts,
    onClick,
  });
  return (
    <LinkButton onClick={onLinkClicked} id={SecurityPageName.alerts} fill>
      <FormattedMessage
        id="xpack.securitySolutionServerless.getStarted.togglePanel.explore.step1.description2.button"
        defaultMessage="View alerts"
      />
    </LinkButton>
  );
};

export const AlertsButton = React.memo(AlertsButtonComponent);
