/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiContextMenuItem } from '@elastic/eui';
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import styled from '@emotion/styled';
import { useLocation } from 'react-router-dom';
import { useKibana } from '../../../../common/lib/kibana';
import { AlertActionsProps } from './types';
import { AlertsTableContext } from '../contexts/alerts_table_context';

const MenuItem = styled(EuiContextMenuItem)`
  &:hover {
    text-decoration: underline;
  }
`;

/**
 * Alerts table row action to open the rule to which the selected alert is associated
 */
export const ViewRuleDetailsAlertAction = memo(({ alert }: AlertActionsProps) => {
  const {
    http: {
      basePath: { prepend },
    },
  } = useKibana().services;
  const { pathname } = useLocation();
  const { resolveRulePagePath } = useContext(AlertsTableContext);

  const ruleId = alert[ALERT_RULE_UUID]?.[0] ?? null;
  const linkToRule = ruleId && resolveRulePagePath ? prepend(resolveRulePagePath(ruleId)) : null;

  if (!linkToRule || linkToRule.endsWith(pathname)) {
    return null;
  }

  return (
    <MenuItem data-test-subj="viewRuleDetails" key="viewRuleDetails" href={linkToRule} size="s">
      {i18n.translate('xpack.triggersActionsUI.alertsTable.viewRuleDetails', {
        defaultMessage: 'View rule details',
      })}
    </MenuItem>
  );
});
