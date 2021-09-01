/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { CommonProps, EuiHorizontalRule, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { CardHeader } from './components/card_header';
import { APP_ID } from '../../../../common/constants';
import { CardSubHeader } from './components/card_sub_header';
import { getEmptyValue } from '../../../common/components/empty_value';
import { CriteriaConditions } from './components/criteria_conditions';
import { EffectScopeProps } from './components/effect_scope';

// FIXME:PT fix types for the artifact type

export interface ArtifactEntryCardProps<T extends {} = {}> extends CommonProps {
  item: T;
  /**
   * An object with policy names keyed by their `id`s. Used when the Artifact's `effectScope` is
   * per policy to display them in a popup menu
   */
  policyNames?: Record<string, string>;
}

/**
 * Display Artifact Items (ex. Trusted App, Event Filter, etc) as a card
 */
export const ArtifactEntryCard = memo<ArtifactEntryCardProps>(
  ({ item, policyNames, ...commonProps }) => {
    // FIXME: make component generic for the data type
    // FIXME: revisit all dev code below

    const policies = useMemo<EffectScopeProps['policies']>(() => {
      return item.effectScope.type === 'policy'
        ? item.effectScope.policies.map((id) => {
            return {
              id,
              name: policyNames ? policyNames[id] : id,
            };
          })
        : undefined;
    }, [item.effectScope.policies, item.effectScope.type, policyNames]);

    return (
      <EuiPanel hasBorder={true} {...commonProps} paddingSize="none">
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l">
          <CardHeader
            name={item.name}
            createdDate={item.created_at}
            updatedDate={item.updated_at}
            actions={[
              {
                'data-test-subj': 'unIsolateLink',
                icon: 'logoSecurity',
                key: 'unIsolateHost',
                navigateAppId: APP_ID,
                navigateOptions: {
                  path: 'test/test',
                },
                href: 'test/test',
                children: (
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.actions.TEST_TEST"
                    defaultMessage="Release host"
                  />
                ),
              },
            ]}
          />
          <CardSubHeader
            createdBy={item.created_by}
            updatedBy={item.updated_by}
            policies={policies}
          />

          <EuiSpacer size="m" />

          <EuiText>
            <p>{item.description || getEmptyValue()}</p>
          </EuiText>
        </EuiPanel>

        <EuiHorizontalRule margin="xs" />

        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l">
          <CriteriaConditions os={item.os} entries={item.entries} />
        </EuiPanel>
      </EuiPanel>
    );
  }
);

ArtifactEntryCard.displayName = 'ArtifactEntryCard';
