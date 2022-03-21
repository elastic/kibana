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
  EuiLink,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

export interface ObservabilityStatusBoxProps {
  id: string;
  title: string;
  hasData: boolean;
  description: string;
  modules: Array<{ name: string; hasData: boolean }>;
  addTitle: string;
  addLink: string;
  learnMoreLink: string;
  goToAppTitle: string;
  goToAppLink: string;
}

export function ObservabilityStatusBox(props: ObservabilityStatusBoxProps) {
  if (props.hasData) {
    return <CompletedStatusBox {...props} />;
  } else {
    return <EmptyStatusBox {...props} />;
  }
}

export function CompletedStatusBox({
  title,
  modules,
  addLink,
  addTitle,
  goToAppTitle,
  goToAppLink,
}: ObservabilityStatusBoxProps) {
  return (
    <EuiPanel color="plain" hasBorder={true}>
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
              <h2>{title}</h2>
            </EuiTitle>
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="s" iconType="plusInCircle" flush="right" href={addLink}>
            {addTitle}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup>
        <EuiFlexItem>
          <FormattedMessage
            id="xpack.observability.status.dataAvailable"
            defaultMessage="Data is available."
          />
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

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiButton color="primary" href={goToAppLink}>
            {goToAppTitle}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

export function EmptyStatusBox({
  title,
  description,
  learnMoreLink,
  addTitle,
  addLink,
}: ObservabilityStatusBoxProps) {
  return (
    <EuiPanel color="warning" hasBorder={true} style={{ marginBottom: 20 }}>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <div>
            <EuiIcon
              type="minusInCircleFilled"
              color="warning"
              className="eui-displayInline eui-alignMiddle"
              style={{ marginRight: 8 }}
            />
            <EuiTitle size="xs" className="eui-displayInline eui-alignMiddle">
              <h2>{title}</h2>
            </EuiTitle>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText size="xs">{description}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton color="primary" href={addLink} target="_blank" fill>
            {addTitle}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink color="primary" href={learnMoreLink} target="_blank">
            <FormattedMessage
              id="xpack.observability.status.learnMoreButton"
              defaultMessage="Learn more"
            />
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
