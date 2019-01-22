/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore
  EuiHeaderLogo,
  EuiHealth,
} from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';

import { FooterContainer } from '.';
import { WhoAmI } from '../../containers/who_am_i';
import * as i18n from './translations';

export const Footer = pure(() => (
  <FooterContainer data-test-subj="footer">
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
      <EuiFlexItem grow={false}>
        <WhoAmI sourceId="default">
          {({ appName }) => (
            <EuiHealth color="success">
              {i18n.LIVE} {appName} {i18n.DATA}
            </EuiHealth>
          )}
        </WhoAmI>
      </EuiFlexItem>
    </EuiFlexGroup>
  </FooterContainer>
));
