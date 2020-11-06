/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiPopover,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiCallOut,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { replaceTokens } from './lib/replace_tokens';
import { AlertMessage, AlertState } from '../../common/types/alerts';
import { AlertsByName } from './types';

interface Props {
  alerts: AlertsByName;
  stateFilter: (state: AlertState) => boolean;
  nextStepsFilter: (nextStep: AlertMessage) => boolean;
}
export const AlertsCallout: React.FC<Props> = (props: Props) => {
  const { alerts, stateFilter = () => true, nextStepsFilter = () => true } = props;
  const [activePopover, setActivePopover] = React.useState<boolean | number>(false);

  const list = [];
  for (const alertTypeId of Object.keys(alerts)) {
    const alertInstance = alerts[alertTypeId];
    for (const { firing, state } of alertInstance.states) {
      if (firing && stateFilter(state)) {
        list.push(state);
      }
    }
  }

  const accordions = list.map((state, index) => {
    const panels = [
      {
        id: 0,
        title: 'Next steps',
        items: (state.ui.message.nextSteps || [])
          .filter(nextStepsFilter)
          .map((step: AlertMessage) => {
            return {
              name: replaceTokens(step),
            };
          }),
      },
    ];
    const button = (
      <EuiLink onClick={() => setActivePopover(index)}>
        <EuiText size="s">View next steps</EuiText>
      </EuiLink>
    );
    const title = (
      <EuiFlexGroup alignItems="baseline" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiText size="s" style={{ display: 'inline' }}>
            {replaceTokens(state.ui.message)}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            id="contextMenuExample"
            button={button}
            isOpen={activePopover === index}
            closePopover={() => setActivePopover(false)}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenu initialPanelId={0} panels={panels} />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
    const buttonContent = <EuiCallOut title={title} color="danger" iconType="bell" size="s" />;

    const spacer = index !== list.length - 1 ? <EuiSpacer /> : null;
    return (
      <div key={index}>
        {buttonContent}
        {spacer}
      </div>
    );
  });

  return (
    <Fragment>
      <EuiPanel>{accordions}</EuiPanel>
      <EuiSpacer />
    </Fragment>
  );
};
