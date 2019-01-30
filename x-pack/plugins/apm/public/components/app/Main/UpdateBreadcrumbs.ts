/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { flatten, last } from 'lodash';
import React from 'react';
// @ts-ignore
import { withBreadcrumbs } from 'react-router-breadcrumbs-hoc';
import chrome from 'ui/chrome';
import { toQuery } from '../../shared/Links/url_helpers';
import { BreadcrumbFunction, BreadcrumbProps, routes } from './routeConfig';

interface BreadcrumbElement {
  type: BreadcrumbFunction;
  props: BreadcrumbProps;
}

interface Props {
  location: Location;
  breadcrumbs: Array<{
    breadcrumb: string | BreadcrumbElement;
    match: {
      url: string;
    };
  }>;
}

class UpdateBreadcrumbsComponent extends React.Component<Props> {
  public updateHeaderBreadcrumbs() {
    const { _g = '', kuery = '' } = toQuery(this.props.location.search);
    const breadcrumbs = this.props.breadcrumbs.map(({ breadcrumb, match }) => {
      const text =
        typeof breadcrumb === 'string'
          ? breadcrumb
          : breadcrumb.type(breadcrumb.props); // "render" the element

      return { text, href: `#${match.url}?_g=${_g}&kuery=${kuery}` };
    });

    document.title = last(breadcrumbs).text;
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
