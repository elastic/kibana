/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiBreadcrumbs } from '@elastic/eui';
import React from 'react';
import { MainRouteParams } from '../../common/types';
import { encodeRevisionString } from '../../utils/url';

interface Props {
  routeParams: MainRouteParams;
}
export class Breadcrumb extends React.PureComponent<Props> {
  public render() {
    const { resource, org, repo, revision, path } = this.props.routeParams;
    const repoUri = `${resource}/${org}/${repo}`;

    const breadcrumbs: Array<{
      text: string;
      href: string;
      className?: string;
      ['data-test-subj']: string;
    }> = [];
    const pathSegments = path ? path.split('/') : [];

    pathSegments.forEach((p, index) => {
      const paths = pathSegments.slice(0, index + 1);
      const href = `#${repoUri}/tree/${encodeRevisionString(revision)}/${paths.join('/')}`;
      breadcrumbs.push({
        text: p,
        href,
        className: 'codeNoMinWidth',
        ['data-test-subj']: `codeFileBreadcrumb-${p}`,
      });
    });
    return <EuiBreadcrumbs max={Number.MAX_VALUE} breadcrumbs={breadcrumbs} />;
  }
}
