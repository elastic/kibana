/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component }  from 'react';
import PropTypes from 'prop-types';

import {
  EuiHeader,
  EuiHeaderSection,
  EuiHeaderBreadcrumb,
  EuiHeaderBreadcrumbs
} from '@elastic/eui';

export class PageHeader extends Component {
  render() {
    return (
      <EuiHeader>
        <EuiHeaderSection>
          <EuiHeaderBreadcrumbs>
            {this.props.breadcrumbs.map(this.buildBreadcrumb)}
          </EuiHeaderBreadcrumbs>
        </EuiHeaderSection>
      </EuiHeader>
    );
  }

  buildBreadcrumb = (breadcrumb) => {
    return (
      <EuiHeaderBreadcrumb key={breadcrumb.id} href={breadcrumb.href} isActive={breadcrumb.current}>
        {breadcrumb.display}
      </EuiHeaderBreadcrumb>
    );
  }
}



PageHeader.propTypes = {
  breadcrumbs: PropTypes.array.isRequired
};
