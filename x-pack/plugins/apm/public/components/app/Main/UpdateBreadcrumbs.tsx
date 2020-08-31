/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import React, { MouseEvent } from 'react';
import { CoreStart } from 'src/core/public';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';
import { getAPMHref } from '../../shared/Links/apm/APMLink';
import {
  Breadcrumb,
  BreadcrumbRoute,
  ProvideBreadcrumbs,
} from './ProvideBreadcrumbs';

interface Props {
  location: Location;
  breadcrumbs: Breadcrumb[];
  core: CoreStart;
}

function getTitleFromBreadCrumbs(breadcrumbs: Breadcrumb[]) {
  return breadcrumbs.map(({ value }) => value).reverse();
}

class UpdateBreadcrumbsComponent extends React.Component<Props> {
  public updateHeaderBreadcrumbs() {
    const { basePath } = this.props.core.http;
    const breadcrumbs = this.props.breadcrumbs.map(
      ({ value, match }, index) => {
        const { search } = this.props.location;
        const isLastBreadcrumbItem =
          index === this.props.breadcrumbs.length - 1;
        const href = isLastBreadcrumbItem
          ? undefined // makes the breadcrumb item not clickable
          : getAPMHref({ basePath, path: match.url, search });
        return {
          text: value,
          href,
          onClick: (event: MouseEvent<HTMLAnchorElement>) => {
            if (href) {
              event.preventDefault();
              this.props.core.application.navigateToUrl(href);
            }
          },
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
