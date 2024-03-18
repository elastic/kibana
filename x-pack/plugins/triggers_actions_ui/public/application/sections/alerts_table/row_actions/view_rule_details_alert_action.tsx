/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiContextMenuItem } from '@elastic/eui';
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import styled from '@emotion/styled';
import { useKibana } from '../../../../common/lib/kibana';
import type { AlertActionsProps } from '../../../../types';

const MenuItem = styled(EuiContextMenuItem)`
  &:hover {
    text-decoration: underline;
  }
`;

/**
 * Alerts table row action to open the rule to which the selected alert is associated
 */
export const ViewRuleDetailsAlertAction = memo(
  ({ alert, resolveRulePagePath, id: pageId }: AlertActionsProps) => {
    const {
      http: {
        basePath: { prepend },
      },
    } = useKibana().services;

    const ruleId = alert[ALERT_RULE_UUID]?.[0] ?? null;
    const pagePath = ruleId && pageId && resolveRulePagePath?.(ruleId, pageId);
    const linkToRule = pagePath ? prepend(pagePath) : null;

    if (!linkToRule) {
      return null;
    }

    return (
      <MenuItem data-test-subj="viewRuleDetails" key="viewRuleDetails" href={linkToRule} size="s">
        {i18n.translate('xpack.triggersActionsUI.alertsTable.viewRuleDetails', {
          defaultMessage: 'View rule details',
        })}
      </MenuItem>
    );
  }
);
