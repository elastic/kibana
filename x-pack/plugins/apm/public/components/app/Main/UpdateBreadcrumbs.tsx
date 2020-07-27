/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import React from 'react';
import { AppMountContext } from 'src/core/public';
import { getAPMHref } from '../../shared/Links/apm/APMLink';
import {
  Breadcrumb,
  ProvideBreadcrumbs,
  BreadcrumbRoute,
} from './ProvideBreadcrumbs';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';

interface Props {
  location: Location;
  breadcrumbs: Breadcrumb[];
  core: AppMountContext['core'];
}

function getTitleFromBreadCrumbs(breadcrumbs: Breadcrumb[]) {
  return breadcrumbs.map(({ value }) => value).reverse();
}

class UpdateBreadcrumbsComponent extends React.Component<Props> {
  public updateHeaderBreadcrumbs() {
    const breadcrumbs = this.props.breadcrumbs.map(
      ({ value, match }, index) => {
        const isLastBreadcrumbItem =
          index === this.props.breadcrumbs.length - 1;
        return {
          text: value,
          href: isLastBreadcrumbItem
            ? undefined // makes the breadcrumb item not clickable
            : getAPMHref(match.url, this.props.location.search),
        };
      }
    );

    this.props.core.chrome.docTitle.change(
      getTitleFromBreadCrumbs(this.props.breadcrumbs)
    );
    this.props.core.chrome.setBreadcrumbs(breadcrumbs);
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

interface UpdateBreadcrumbsProps {
  routes: BreadcrumbRoute[];
}

export function UpdateBreadcrumbs({ routes }: UpdateBreadcrumbsProps) {
  const { core } = useApmPluginContext();

  return (
    <ProvideBreadcrumbs
      routes={routes}
      render={({ breadcrumbs, location }) => (
        <UpdateBreadcrumbsComponent
          breadcrumbs={breadcrumbs}
          location={location}
          core={core}
        />
      )}
    />
  );
}
