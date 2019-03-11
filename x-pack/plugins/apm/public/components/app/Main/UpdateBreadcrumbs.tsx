/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { last, pick } from 'lodash';
import React from 'react';
import chrome from 'ui/chrome';
import {
  fromQuery,
  PERSISTENT_APM_PARAMS,
  toQuery
} from '../../shared/Links/url_helpers';
import { Breadcrumb, ProvideBreadcrumbs } from './ProvideBreadcrumbs';
import { routes } from './routeConfig';

interface Props {
  location: Location;
  breadcrumbs: Breadcrumb[];
}

class UpdateBreadcrumbsComponent extends React.Component<Props> {
  public updateHeaderBreadcrumbs() {
    const query = toQuery(this.props.location.search);
    const persistentParams = pick(query, PERSISTENT_APM_PARAMS);
    const search = fromQuery(persistentParams);
    const breadcrumbs = this.props.breadcrumbs.map(({ value, match }) => ({
      text: value,
      href: `#${match.url}?${search}`
    }));

    const current = last(breadcrumbs) || { text: '' };
    document.title = current.text;
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

export function UpdateBreadcrumbs() {
  return (
    <ProvideBreadcrumbs
      routes={routes}
      render={({ breadcrumbs, location }) => (
        <UpdateBreadcrumbsComponent
          breadcrumbs={breadcrumbs}
          location={location}
        />
      )}
    />
  );
}
