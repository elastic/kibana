/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Component } from 'react';

import { RouteProps } from 'react-router';
import { Route } from 'react-router-dom';
import { BreadcrumbConsumer } from './consumer';
import { Breadcrumb, BreadcrumbContext } from './types';

interface WrappedRouteWithBreadcrumbProps extends RouteProps {
  text: string;
  href: string;
  parents?: Breadcrumb[];
  context: BreadcrumbContext;
}

class WrappedRouteWithBreadcrumb extends Component<
  WrappedRouteWithBreadcrumbProps,
  {},
  BreadcrumbContext
> {
  public componentWillUnmount() {
    const { text, href, context } = this.props;

    context.removeCrumb({
      text,
      href,
    });
  }

  public componentDidMount() {
    const { text, href, parents, context } = this.props;
    context.addCrumb(
      {
        text,
        href,
      },
      parents
    );
  }

  public render() {
    return this.props.children;
  }
}

type titleCallback = (
  urlParams: {
    [key: string]: string;
  }
) => string;
interface RouteWithBreadcrumbProps extends RouteProps {
  title: string | titleCallback;
  path: string;
  parentBreadcrumbs?: Breadcrumb[];
}

export const RouteWithBreadcrumb: React.SFC<RouteWithBreadcrumbProps> = ({
  title,
  render,
  component: RouteComponent,
  parentBreadcrumbs,
  ...props
}) => (
  <Route
    {...props}
    render={renderProps => {
      return (
        <BreadcrumbConsumer>
          {context => (
            <WrappedRouteWithBreadcrumb
              parents={parentBreadcrumbs}
              href={props.path}
              text={typeof title === 'function' ? title(renderProps.match.params) : title}
              context={context}
            >
              {render && render(renderProps)}
              {RouteComponent && <RouteComponent {...renderProps} />}
            </WrappedRouteWithBreadcrumb>
          )}
        </BreadcrumbConsumer>
      );
    }}
  />
);
