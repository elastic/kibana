/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Component, ReactElement } from 'react';
import { Provider } from './context';
import { Breadcrumb } from './types';
import { services } from '../../../kbn_services';

interface ComponentProps {
  useGlobalBreadcrumbs: boolean;
  children: ReactElement<any> | Array<ReactElement<any>>;
}

interface ComponentState {
  breadcrumbs: Array<{
    href?: string;
    breadcrumb: Breadcrumb;
    parents?: Breadcrumb[];
  }>;
}

export class BreadcrumbProvider extends Component<ComponentProps, ComponentState> {
  public state = {
    breadcrumbs: [] as ComponentState['breadcrumbs'],
  };

  public addCrumb = (breadcrumb: Breadcrumb, parents?: Breadcrumb[]) => {
    this.setState(({ breadcrumbs: prevCrumbs }) => ({
      breadcrumbs: [
        ...prevCrumbs,
        {
          href: breadcrumb.href,
          breadcrumb,
          parents,
        },
      ],
    }));
  };

  public removeCrumb = (crumbToRemove: Breadcrumb) => {
    this.setState(({ breadcrumbs: prevCrumbs }) => {
      const breadcrumbs = prevCrumbs.filter((prevCrumb) => {
        const { href } = prevCrumb;
        return !(crumbToRemove.href === href);
      });
      return { breadcrumbs };
    });
  };

  public render() {
    const { breadcrumbs } = this.state;

    const context = {
      breadcrumbs: breadcrumbs.reduce((crumbs, crumbStorageItem) => {
        if (crumbStorageItem.parents) {
          crumbs = crumbs.concat(crumbStorageItem.parents);
        }
        crumbs.push(crumbStorageItem.breadcrumb);
        return crumbs;
      }, [] as Breadcrumb[]),
      addCrumb: this.addCrumb,
      removeCrumb: this.removeCrumb,
    };
    if (this.props.useGlobalBreadcrumbs) {
      services.setBreadcrumbs(context.breadcrumbs);
    }
    return <Provider value={context}>{this.props.children}</Provider>;
  }
}
