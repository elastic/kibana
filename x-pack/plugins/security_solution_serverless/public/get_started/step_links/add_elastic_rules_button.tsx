/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback } from 'react';
import { useGetLinkProps } from '@kbn/security-solution-navigation/links';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { EuiButton } from '@elastic/eui';

const AddElasticRulesButtonComponent = () => {
  const getLinkProps = useGetLinkProps();
  const onClick = useCallback((e) => {
    // TODO: telemetry https://github.com/elastic/kibana/issues/163247
  }, []);
  const { onClick: onLinkClicked } = getLinkProps({
    id: SecurityPageName.rules,
    onClick,
  });
  return (
    <EuiButton onClick={onLinkClicked}>
      <FormattedMessage
        id="xpack.securitySolutionServerless.getStarted.togglePanel.configure.step4.description2.button"
        defaultMessage="Add Elastic rules"
      />
    </EuiButton>
  );
};

export const AddElasticRulesButton = React.memo(AddElasticRulesButtonComponent);
