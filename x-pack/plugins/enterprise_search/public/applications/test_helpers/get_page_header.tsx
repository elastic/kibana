/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiPageHeaderProps } from '@elastic/eui';

/*
 * Given an AppSearchPageTemplate or WorkplaceSearchPageTemplate, these
 * helpers dive into various parts of the EuiPageHeader to make assertions
 * slightly less of a pain in shallow renders
 */

export const getPageHeader = (wrapper: ShallowWrapper) => {
  const pageHeader = wrapper.prop('pageHeader') as EuiPageHeaderProps;
  return pageHeader || {};
};

export const getPageTitle = (wrapper: ShallowWrapper) => {
  return getPageHeader(wrapper).pageTitle;
};

export const getPageDescription = (wrapper: ShallowWrapper) => {
  return getPageHeader(wrapper).description;
};

export const getPageHeaderActions = (wrapper: ShallowWrapper) => {
  const actions = getPageHeader(wrapper).rightSideItems || [];

  return shallow(
    <div>
      {actions.map((action: React.ReactNode, i) => (
        <Fragment key={i}>{action}</Fragment>
      ))}
    </div>
  );
};

export const getPageHeaderChildren = (wrapper: ShallowWrapper) => {
  const children = getPageHeader(wrapper).children || null;

  return shallow(<div>{children}</div>);
};
