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
import { useGetLinkProps } from '@kbn/security-solution-navigation/links';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { EuiButton } from '@elastic/eui';

const InstallAgentButtonComponent = () => {
  const getLinkProps = useGetLinkProps();
  const onClick = useCallback((e) => {
    // TODO: telemetry https://github.com/elastic/kibana/issues/163247
  }, []);
  const { onClick: onLinkClicked } = getLinkProps({
    id: SecurityPageName.endpoints,
    onClick,
  });
  return (
    <EuiButton onClick={onLinkClicked} fill>
      <FormattedMessage
        id="xpack.securitySolutionServerless.getStarted.togglePanel.configure.step2.description2.button"
        defaultMessage="Install Agent"
      />
    </EuiButton>
  );
};

export const InstallAgentButton = React.memo(InstallAgentButtonComponent);
