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
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useUiTracker } from '../../../hooks/use_track_metric';
import { useKibana } from '../../../utils/kibana_react';

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
  weight: number;
}

export function ObservabilityStatusBox(props: ObservabilityStatusBoxProps) {
  if (props.hasData) {
    return <CompletedStatusBox {...props} />;
  } else {
    return <EmptyStatusBox {...props} />;
  }
}

export function CompletedStatusBox({
  id,
  title,
  modules,
  addLink,
  addTitle,
  goToAppTitle,
  goToAppLink,
}: ObservabilityStatusBoxProps) {
  const { application } = useKibana().services;
  const trackMetric = useUiTracker({ app: 'observability-overview' });

  const goToAddLink = useCallback(() => {
    trackMetric({ metric: `guided_setup_add_integrations_${id}` });
    application.navigateToUrl(addLink);
  }, [addLink, application, trackMetric, id]);

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
          <EuiButtonEmpty size="s" iconType="plusInCircle" flush="right" onClick={goToAddLink}>
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
  id,
  title,
  description,
  learnMoreLink,
  addTitle,
  addLink,
}: ObservabilityStatusBoxProps) {
  const { application } = useKibana().services;
  const trackMetric = useUiTracker({ app: 'observability-overview' });

  const goToAddLink = useCallback(() => {
    trackMetric({ metric: `guided_setup_add_data_${id}` });
    application.navigateToUrl(addLink);
  }, [id, trackMetric, application, addLink]);

  return (
    <EuiPanel color="warning" hasBorder={true}>
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
          <EuiText size="s">{description}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton color="primary" onClick={goToAddLink} fill>
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
