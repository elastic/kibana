/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { FC } from 'react';

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import type { WarningSchema } from '../../../../common/detection_engine/schemas/response';
import { useKibana } from '../../lib/kibana/kibana_react';
import * as i18n from './translations';

interface ActionConnectorWarningsComponentProps {
  actionConnectorsWarnings: WarningSchema[];
  importedActionConnectorsCount?: number;
}
const ActionConnectorWarningsComponent: FC<ActionConnectorWarningsComponentProps> = ({
  actionConnectorsWarnings,
  importedActionConnectorsCount,
}) => {
  const { http } = useKibana().services;

  if (!importedActionConnectorsCount) return null;
  const { actionPath } = actionConnectorsWarnings[0];

  return (
    <EuiCallOut
      data-test-subj="actionConnectorsWarningsCallOut"
      size="m"
      heading="h2"
      iconType="alert"
      title={i18n.ACTION_CONNECTORS_WARNING_TITLE(importedActionConnectorsCount)}
      color="warning"
    >
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiText size="xs">
            {i18n.ACTION_CONNECTORS_WARNING_MESSAGE(actionConnectorsWarnings.length)}

            <EuiLink href={http.basePath.prepend(actionPath)}>
              {i18n.ACTION_CONNECTORS_WARNING_LINK}
            </EuiLink>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};

ActionConnectorWarningsComponent.displayName = 'ActionConnectorWarningsComponent';

export const ActionConnectorWarnings = React.memo(ActionConnectorWarningsComponent);

ActionConnectorWarnings.displayName = 'ActionConnectorWarnings';
