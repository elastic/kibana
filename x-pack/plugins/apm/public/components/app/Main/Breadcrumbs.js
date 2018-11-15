/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { withBreadcrumbs } from 'react-router-breadcrumbs-hoc';
import { toQuery } from '../../../utils/url';
import { routes } from './routeConfig';
import { flatten, capitalize } from 'lodash';
import { set } from 'ui/chrome/services/breadcrumb_state';

class Breadcrumbs extends React.Component {
  updateHeaderBreadcrumbs() {
    const { _g = '', kuery = '' } = toQuery(this.props.location.search);
    const breadcrumbs = this.props.breadcrumbs.map(({ breadcrumb, match }) => ({
      text: breadcrumb,
      href: `#${match.url}?_g=${_g}&kuery=${kuery}`
    }));

    set(breadcrumbs);
  }

  componentDidMount() {
    this.updateHeaderBreadcrumbs();
  }

  componentDidUpdate() {
    this.updateHeaderBreadcrumbs();
  }

  render() {
    const { breadcrumbs, location, showPluginBreadcrumbs } = this.props;
    const { _g = '', kuery = '' } = toQuery(location.search);

    // If we don't display plugin breadcrumbs, render null, but continue
    // to push updates to header.
    if (!showPluginBreadcrumbs) {
      return null;
    }

    return (
      <div className="kuiLocalBreadcrumbs">
        {breadcrumbs.map(({ breadcrumb, path, match }, i) => {
          const isLast = i === breadcrumbs.length - 1;
          return (
            <div
              key={path}
              className="kuiLocalBreadcrumb"
              style={{ lineHeight: '29px' }}
            >
              {isLast ? (
                <span
                  ref={node => {
                    if (node && document.title !== node.textContent) {
                      document.title = capitalize(node.textContent);
                    }
                  }}
                >
                  {breadcrumb}
                </span>
              ) : (
                <a href={`#${match.url}?_g=${_g}&kuery=${kuery}`}>
                  {breadcrumb}
                </a>
              )}
            </div>
          );
        })}
      </div>
    );
  }
}

const flatRoutes = flatten(
  routes.map(route => (route.switch ? route.routes : route))
);

export default withBreadcrumbs(flatRoutes)(Breadcrumbs);
