/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiLinkAnchorProps } from '@elastic/eui';
import createHistory from 'history/createHashHistory';
import _ from 'lodash';
import qs from 'querystring';
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import rison from 'rison-node';
import chrome from 'ui/chrome';
import url from 'url';
import { StringMap } from '../../typings/common';

interface ViewMlJobArgs {
  serviceName: string;
  transactionType: string;
  location: any;
  children: any;
}

export function ViewMLJob({
  serviceName,
  transactionType,
  location,
  children = 'View Job'
}: ViewMlJobArgs) {
  const { _g, _a } = decodeKibanaSearchParams(location.search);
  const pathname = '/app/ml';
  const hash = '/timeseriesexplorer';
  const jobId = `${serviceName}-${transactionType}-high_mean_response_time`;
  const query = {
    _g: {
      ...(_g as object),
      ml: {
        jobIds: [jobId]
      }
    },
    _a
  };

  return (
    <KibanaLink
      pathname={pathname}
      hash={hash}
      query={query}
      children={children}
    />
  );
}

export function toQuery(search?: string) {
  return search ? qs.parse(search.slice(1)) : {};
}

export function fromQuery(query: StringMap) {
  const encodedQuery = encodeQuery(query, ['_g', '_a']);
  return stringifyWithoutEncoding(encodedQuery);
}

export function encodeQuery(query: StringMap, exclude: string[] = []) {
  return _.mapValues(query, (value: any, key: string) => {
    if (exclude.includes(key)) {
      return encodeURI(value);
    }
    return qs.escape(value);
  });
}

function stringifyWithoutEncoding(query: StringMap) {
  return qs.stringify(query, undefined, undefined, {
    encodeURIComponent: (v: string) => v
  });
}

function decodeAsObject(value: string) {
  const decoded = rison.decode(value);
  return _.isPlainObject(decoded) ? decoded : {};
}

export function decodeKibanaSearchParams(search: string) {
  const query = toQuery(search);
  return {
    _g:
      query._g && typeof query._g === 'string'
        ? decodeAsObject(query._g)
        : null,
    _a:
      query._a && typeof query._a === 'string' ? decodeAsObject(query._a) : null
  };
}

export function encodeKibanaSearchParams(query: StringMap) {
  return stringifyWithoutEncoding({
    _g: rison.encode(query._g),
    _a: rison.encode(query._a)
  });
}

export interface RelativeLinkComponentArgs {
  location: {
    search?: string;
    pathname?: string;
  };
  path: string;
  query?: StringMap;
  disabled: boolean;
  to: StringMap;
  className: string;
}
export function RelativeLinkComponent({
  location,
  path,
  query,
  disabled,
  ...props
}: RelativeLinkComponentArgs) {
  if (disabled) {
    return <EuiLink aria-disabled="true" {...props} />;
  }

  // Shorthand for pathname
  const pathname = path || _.get(props.to, 'pathname') || location.pathname;

  // Add support for querystring as object
  const search =
    query || _.get(props.to, 'query')
      ? fromQuery({
          ...toQuery(location.search),
          ...query,
          ..._.get(props.to, 'query')
        })
      : location.search;

  return (
    <Link
      {...props}
      to={{ ...location, ...props.to, pathname, search }}
      className={`euiLink euiLink--primary ${props.className || ''}`}
    />
  );
}

// TODO:
// Both KibanaLink and RelativeLink does similar things, are too magic, and have different APIs.
// The initial idea with KibanaLink was to automatically preserve the timestamp (_g) when making links. RelativeLink went a bit overboard and preserves all query args
// The two components have different APIs: `path` vs `pathname` and one uses EuiLink the other react-router's Link (which behaves differently)
// Suggestion: Deprecate RelativeLink, and clean up KibanaLink

export interface KibanaLinkArgs {
  location: {
    search?: string;
    pathname?: string;
  };
  pathname: string;
  hash?: string;
  query?: StringMap;
  disabled?: boolean;
  to?: StringMap;
  className?: string;
}

export function KibanaLinkComponent({
  location,
  pathname,
  hash,
  query = {},
  ...props
}: KibanaLinkArgs) {
  // Preserve current _g and _a
  const currentQuery = toQuery(location.search);
  const nextQuery = {
    ...query,
    _g: query._g ? rison.encode(query._g) : currentQuery._g,
    _a: query._a ? rison.encode(query._a) : ''
  };

  const search = stringifyWithoutEncoding(nextQuery);
  const href = url.format({
    pathname: chrome.addBasePath(pathname),
    hash: `${hash}?${search}`
  });

  return <EuiLink {...props} href={href} />;
}

const withLocation = connect(
  ({ location }: { location: any }) => ({ location }),
  {}
);
export const RelativeLink = withLocation(RelativeLinkComponent);
export const KibanaLink = withLocation(KibanaLinkComponent);

// This is downright horrible 😭 💔
// Angular decodes encoded url tokens like "%2F" to "/" which causes the route to change.
// It was supposedly fixed in https://github.com/angular/angular.js/commit/1b779028fdd339febaa1fff5f3bd4cfcda46cc09 but still seeing the issue
export function legacyEncodeURIComponent(rawUrl?: string) {
  return rawUrl && encodeURIComponent(rawUrl).replace(/%/g, '~');
}

export function legacyDecodeURIComponent(encodedUrl?: string) {
  return encodedUrl && decodeURIComponent(encodedUrl.replace(/~/g, '%'));
}

export function ExternalLink(props: EuiLinkAnchorProps) {
  return <EuiLink target="_blank" rel="noopener noreferrer" {...props} />;
}

// Make history singleton available across APM project.
// This is not great. Other options are to use context or withRouter helper
// React Context API is unstable and will change soon-ish (probably 16.3)
// withRouter helper from react-router overrides several props (eg. `location`) which makes it less desireable
export const history = createHistory();
