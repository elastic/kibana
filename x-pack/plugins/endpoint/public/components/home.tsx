/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  EuiButton,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPageSideBar,
  EuiTitle,
  EuiSideNav,
} from '@elastic/eui';
import { actions as homeActions } from '../actions/home';

export const Home = () => {
  const dispatch = useDispatch();
  const renderBootstrapButton = () => {
    async function onBootstrap() {
      dispatch(homeActions.userClickedBootstrap());
      // TODO: how to unselect once pressed? See https://github.com/elastic/eui/issues/1077
    }

    return (
      <EuiButton color="danger" iconType="trash" onClick={onBootstrap}>
        Bootstrap
      </EuiButton>
    );
  };

  const bootstrapButton = renderBootstrapButton();
  return (
    <EuiPageBody>
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>Welcome to Endpoint!</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle>
              <h2>Home Page</h2>
            </EuiTitle>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
        <EuiPageContentBody>Body Content {bootstrapButton}</EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
};
