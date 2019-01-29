/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { flatten } from 'lodash';
import React from 'react';
// @ts-ignore
import { withBreadcrumbs } from 'react-router-breadcrumbs-hoc';
import chrome from 'ui/chrome';
import { toQuery } from '../../shared/Links/url_helpers';
import { routes } from './routeConfig';

interface Props {
  location: Location;
  breadcrumbs: Array<{
    breadcrumb: any;
    match: {
      url: string;
    };
  }>;
}

class UpdateBreadcrumbsComponent extends React.Component<Props> {
  public updateHeaderBreadcrumbs() {
    const { _g = '', kuery = '' } = toQuery(this.props.location.search);
    const breadcrumbs = this.props.breadcrumbs.map(({ breadcrumb, match }) => ({
      text: breadcrumb,
      href: `#${match.url}?_g=${_g}&kuery=${kuery}`
    }));

    chrome.breadcrumbs.set(breadcrumbs);
  }

  public componentDidMount() {
    this.updateHeaderBreadcrumbs();
  }

  public componentDidUpdate() {
    this.updateHeaderBreadcrumbs();
  }

  public render() {
    return null;
  }
}

const flatRoutes = flatten(
  routes.map(route => (route.switchRoutes ? route.switchRoutes : route))
);

const UpdateBreadcrumbs = withBreadcrumbs(flatRoutes)(
  UpdateBreadcrumbsComponent
);

export { UpdateBreadcrumbs };
