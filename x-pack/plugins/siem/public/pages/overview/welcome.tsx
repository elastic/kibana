/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

export const FlexGroup = styled(EuiFlexGroup)`
  margin-top: 78px;
`;

export const Welcome = pure(() => (
  <>
    <FlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiTitle size="l">
          <h1>
            <FormattedMessage id="xpack.siem.overview.pageTitle" defaultMessage="SIEM" />
          </h1>
        </EuiTitle>
        <EuiText color="subdued" size="s">
          <p>
            <FormattedMessage
              id="xpack.siem.overview.pageSubtitle"
              defaultMessage="Security Information & Event Management with the Elastic Stack"
            />
          </p>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiButton href="kibana#home/tutorial_directory/security">
          <FormattedMessage id="xpack.siem.overview.pageAction" defaultMessage="Add Data" />
        </EuiButton>
      </EuiFlexItem>
    </FlexGroup>

    <EuiHorizontalRule margin="xxl" />
  </>
));
