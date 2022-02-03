/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CSSProperties } from 'react';
import React, { memo } from 'react';

import type { AgentPolicy } from '../../common/types';
import { useLink } from '../hooks';
const MIN_WIDTH: CSSProperties = { minWidth: 0 };
const NO_WRAP_WHITE_SPACE: CSSProperties = { whiteSpace: 'nowrap' };

export const AgentPolicySummaryLine = memo<{ policy: AgentPolicy }>(({ policy }) => {
  const { getHref } = useLink();
  const { name, id, revision, is_managed: isManaged } = policy;
  return (
    <EuiFlexGroup gutterSize="s" alignItems="baseline" style={MIN_WIDTH} responsive={false}>
      <EuiFlexItem grow={false} className="eui-textTruncate">
        <EuiLink
          className={`eui-textTruncate`}
          href={getHref('policy_details', { policyId: id })}
          title={name || id}
          data-test-subj="agentPolicyNameLink"
        >
          {name || id}
        </EuiLink>
      </EuiFlexItem>
      {isManaged && (
        <EuiIconTip
          title="Hosted agent policy"
          content={i18n.translate('xpack.fleet.agentPolicySummaryLine.hostedPolicyTooltip', {
            defaultMessage:
              'This policy is managed outside of Fleet. Most actions related to this policy are unavailable.',
          })}
          type="lock"
          size="m"
          color="subdued"
        />
      )}
      {revision && (
        <EuiFlexItem grow={true}>
          <EuiText color="subdued" size="xs" style={NO_WRAP_WHITE_SPACE}>
            <FormattedMessage
              id="xpack.fleet.agentPolicySummaryLine.revisionNumber"
              defaultMessage="rev. {revNumber}"
              values={{ revNumber: revision }}
            />
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});
