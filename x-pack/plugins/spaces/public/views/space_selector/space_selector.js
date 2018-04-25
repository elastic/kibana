/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiPage,
  EuiPageHeader,
  EuiPageBody,
  EuiPageContent,
  EuiPageHeaderSection,
  EuiCard,
  EuiIcon,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

export const SpaceSelector = (props) => (
  <EuiPage>
    <EuiPageHeader>
      <EuiPageHeaderSection className="logoHeader">
        <EuiIcon size="xxl" type={`logoKibana`} />
      </EuiPageHeaderSection>
    </EuiPageHeader>
    <EuiPageBody>
      <EuiPageContent>
        <EuiText className="spaceWelcomeText">
          <p className="welcomeLarge">Welcome to Kibana.</p>
          <p className="welcomeMedium">Select a space to begin.</p>
        </EuiText>

        <EuiFlexGroup gutterSize="l" justifyContent="spaceEvenly" className="spacesGroup">
          {props.spaces.map(renderSpace)}
        </EuiFlexGroup>

        <EuiText className="spaceProfileText">
          <p>You can change your workspace at anytime by accessing your profile within Kibana.</p>
        </EuiText>
      </EuiPageContent>
    </EuiPageBody>
  </EuiPage>
);

function renderSpace(space) {
  return (
    <EuiFlexItem key={space.id} grow={false} className="spaceCard">
      <EuiCard
        icon={<EuiIcon size="xxl" type={space.logo} />}
        title={renderSpaceTitle(space)}
        description={space.description}
        onClick={() => window.alert('Card clicked')}
      />
    </EuiFlexItem>
  );
}

function renderSpaceTitle(space) {
  return (
    <div className="spaceCardTitle">
      <span>{space.name}</span>
      {/* <EuiIcon type={'starEmpty'} size="s" /> */}
    </div>
  );
}
