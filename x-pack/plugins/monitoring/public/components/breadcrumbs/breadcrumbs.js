/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiBreadcrumbs
} from '@elastic/eui';
import { getBreadcrumbs } from '../../store/selectors';
import { connect } from 'react-redux';
import { getRouterLinkProps } from '../../routing';

const BreadcrumbsComponent = ({ breadcrumbs }) => {
  const updatedBreadcrumbs = breadcrumbs.map(breadcrumb => {
    const { href, ...rest } = breadcrumb;
    return {
      ...rest,
      ...href ? getRouterLinkProps(breadcrumb.href) : {}
    };
  });

  return (
    <EuiBreadcrumbs
      breadcrumbs={updatedBreadcrumbs}
    />
  );
};

export const Breadcrumbs = connect(
  state => ({
    breadcrumbs: getBreadcrumbs(state)
  })
)(BreadcrumbsComponent);
