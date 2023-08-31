/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { LinkButton, useGetLinkProps } from '@kbn/security-solution-navigation/links';
import { ExternalPageName } from '../../navigation/links/constants';

const InstallAgentButtonComponent = () => {
  const getLinkProps = useGetLinkProps();
  const onClick = useCallback((e) => {
    // TODO: telemetry https://github.com/elastic/kibana/issues/163247
  }, []);
  const { onClick: onLinkClicked } = getLinkProps({
    id: ExternalPageName.fleetAgents,
    onClick,
  });
  return (
    <LinkButton onClick={onLinkClicked} fill id={ExternalPageName.fleetAgents}>
      <FormattedMessage
        id="xpack.securitySolutionServerless.getStarted.togglePanel.configure.step2.description2.button"
        defaultMessage="Install Agent"
      />
    </LinkButton>
  );
};

export const InstallAgentButton = React.memo(InstallAgentButtonComponent);
