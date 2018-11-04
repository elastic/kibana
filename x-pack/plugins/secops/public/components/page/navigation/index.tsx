/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import {
  // @ts-ignore
  EuiAvatar,
  EuiButton,
  EuiHeader,
  // @ts-ignore
  EuiHeaderLink,
  // @ts-ignore
  EuiHeaderLinks,
  // @ts-ignore
  EuiHeaderLogo,
  EuiHeaderSection,
  // @ts-ignore
  EuiHeaderSectionItem,
} from '@elastic/eui';

const AddData: React.SFC = () => (
  <div
    style={{
      margin: '0 5px',
    }}
  >
    <EuiButton href="kibana#home/tutorial_directory/security">Add data</EuiButton>
  </div>
);

const UserAvatar: React.SFC = () => (
  <div
    style={{
      margin: '0 5px',
    }}
  >
    <EuiAvatar size="l" name="Username" imageUrl="https://source.unsplash.com/64x64/?cat" />
  </div>
);

export const Navigation: React.SFC = () => (
  <EuiHeader>
    <EuiHeaderSection>
      <EuiHeaderSectionItem border="right">
        <EuiHeaderLogo iconType="securityApp" href="#">
          <span>Sec Ops</span>
        </EuiHeaderLogo>
      </EuiHeaderSectionItem>

      <EuiHeaderLinks>
        <EuiHeaderLink href="#">Overview</EuiHeaderLink>
        <EuiHeaderLink href="#">Hosts</EuiHeaderLink>
        <EuiHeaderLink href="#">Network</EuiHeaderLink>
      </EuiHeaderLinks>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          marginRight: '10px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <AddData />
          <UserAvatar />
        </div>
      </div>
    </EuiHeaderSection>
  </EuiHeader>
);
