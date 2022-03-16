/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

export interface ObservabilityStatusBoxProps {
  id: string;
  dataSourceName: string;
  hasData: boolean;
  description: string;
  modules: Array<{ name: string; hasData: boolean }>;
  integrationLink: string;
  learnMoreLink: string;
}

export function ObservabilityStatusBox(props: ObservabilityStatusBoxProps) {
  if (props.hasData) {
    return <CompletedStatusBox {...props} />;
  } else {
    return <EmptyStatusBox {...props} />;
  }
}

export function CompletedStatusBox({
  dataSourceName,
  modules,
  integrationLink,
}: ObservabilityStatusBoxProps) {
  return (
    <EuiPanel color="subdued">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <div>
            <EuiIcon
              type="checkInCircleFilled"
              color="success"
              className="eui-displayInline eui-alignMiddle"
              style={{ marginRight: 8 }}
            />
            <EuiTitle size="xs" className="eui-displayInline eui-alignMiddle">
              <h2>{dataSourceName}</h2>
            </EuiTitle>
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="xs" iconType="plusInCircle" flush="right" href={integrationLink}>
            <FormattedMessage
              id="xpack.observability.status.addIntegrationLink"
              defaultMessage="Add"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup alignItems="baseline" gutterSize="s" style={{ marginTop: 8 }} role="list">
        {modules.map((module) => (
          <EuiFlexItem role="listitem" key={module.name}>
            <EuiBadge
              color={module.hasData ? 'success' : 'hollow'}
              iconType="check"
              iconSide="left"
            >
              {module.name}
            </EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
}

export function EmptyStatusBox({
  dataSourceName,
  description,
  learnMoreLink,
}: ObservabilityStatusBoxProps) {
  return (
    <EuiPanel color="subdued" style={{ marginBottom: 20 }}>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <div>
            <EuiIcon
              type="dot"
              color="warning"
              className="eui-displayInline eui-alignMiddle"
              style={{ marginRight: 8 }}
            />
            <EuiTitle size="xs" className="eui-displayInline eui-alignMiddle">
              <h2>{dataSourceName}</h2>
            </EuiTitle>
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type="cross" color="text" />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText size="xs">{description}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiButton color="primary" size="s" href={learnMoreLink}>
            <FormattedMessage
              id="xpack.observability.status.learnMoreButton"
              defaultMessage="Learn more"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
