/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiFlyoutProps } from '@elastic/eui';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

const FlyoutWithHigherZIndex = styled(EuiFlyout)`
  z-index: ${(props) => props.theme.eui.euiZLevel5};
`;

interface Props extends EuiFlyoutProps {
  onClose: () => void;
}

export const HintDetailsFlyout: React.FunctionComponent<Props> = ({
  onClose,
  as,
  ...restOfProps
}) => {
  const header = (
    <EuiFlyoutHeader hasBorder aria-labelledby="CreateAgentPolicyFlyoutTitle">
      <EuiTitle size="m">
        <h2 id="CreateAgentPolicyFlyoutTitle">
          <FormattedMessage
            id="xpack.fleet.createAgentPolicy.flyoutTitle"
            defaultMessage="Create agent policy"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.fleet.createAgentPolicy.flyoutTitleDescription"
            defaultMessage="Agent policies are used to manage settings across a group of agents. You can add integrations to your agent policy to specify what data your agents collect. When you edit an agent policy, you can use Fleet to deploy updates to a specified group of agents."
          />
        </p>
      </EuiText>
    </EuiFlyoutHeader>
  );

  const body = (
    <EuiFlyoutBody>
      <>hello</>
    </EuiFlyoutBody>
  );

  const footer = (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={() => onClose()} flush="left">
            <FormattedMessage
              id="xpack.fleet.createAgentPolicy.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );

  return (
    <FlyoutWithHigherZIndex onClose={() => onClose()} size="l" maxWidth={400} {...restOfProps}>
      {header}
      {body}
      {footer}
    </FlyoutWithHigherZIndex>
  );
};
