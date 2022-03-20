/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText, EuiBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { RuleNameProps } from '../types';
import { useKibana } from '../../../utils/kibana_react';

export function Name({ name, rule }: RuleNameProps) {
  const { http } = useKibana().services;
  const detailsLink = http.basePath.prepend(
    `/app/management/insightsAndAlerting/triggersActions/rule/${rule.id}`
  );
  const link = (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiLink title={name} href={detailsLink}>
              {name}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="xs">
          {rule.ruleType}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
  return (
    <>
      {link}
      {rule.enabled && rule.muteAll && (
        <EuiBadge data-test-subj="mutedActionsBadge" color="hollow">
          <FormattedMessage
            id="xpack.observability.rules.rulesTable.columns.mutedBadge"
            defaultMessage="Muted"
          />
        </EuiBadge>
      )}
    </>
  );
}
