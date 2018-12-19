/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiLinkAnchorProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import createHistory from 'history/createHashHistory';
import { get, isPlainObject, mapValues } from 'lodash';
import qs from 'querystring';
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import rison from 'rison-node';
import chrome from 'ui/chrome';
import url from 'url';
import { StringMap } from '../../typings/common';

// Kibana default set in: https://github.com/elastic/kibana/blob/e13e47fc4eb6112f2a5401408e9f765eae90f55d/x-pack/plugins/apm/public/utils/timepicker/index.js#L31-L35
// TODO: store this in config or a shared constant?
const DEFAULT_KIBANA_TIME_RANGE = {
  time: {
    from: 'now-24h',
    mode: 'quick',
    to: 'now'
  }
};

const viewJobLabel: string = i18n.translate(
  'xpack.apm.viewMLJob.viewJobLabel',
  {
    defaultMessage: 'View Job'
  }
);

interface ViewMlJobArgs {
  serviceName: string;
  transactionType: string;
  location: any;
}

export const ViewMLJob: React.SFC<ViewMlJobArgs> = ({
  serviceName,
  transactionType,
  location,
  children = viewJobLabel
}) => {
  const pathname = '/app/ml';
  const hash = '/timeseriesexplorer';
  const jobId = `${serviceName}-${transactionType}-high_mean_response_time`;
  const query = {
    _g: {
      ml: {
        jobIds: [jobId]
      }
    }
  };

  return (
    <UnconnectedKibanaLink
      location={location}
      pathname={pathname}
      hash={hash}
      query={query}
      children={children}
    />
  );
};

export function toQuery(search?: string): StringMap<any> {
  return search ? qs.parse(search.slice(1)) : {};
}

export function fromQuery(query: StringMap) {
  const encodedQuery = encodeQuery(query, ['_g', '_a']);
  return stringifyWithoutEncoding(encodedQuery);
}

export function encodeQuery(query: StringMap, exclude: string[] = []) {
  return mapValues(query, (value: any, key: string) => {
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

function risonSafeDecode(value: string) {
  try {
    const decoded = rison.decode(value);
    return isPlainObject(decoded) ? (decoded as StringMap) : {};
  } catch (e) {
    return {};
  }
}

function decodeAndMergeG(g: string, toBeMerged?: StringMap) {
  const decoded = risonSafeDecode(g);
  return { ...DEFAULT_KIBANA_TIME_RANGE, ...decoded, ...toBeMerged };
}

export interface RelativeLinkComponentArgs {
  location: {
    search?: string;
    pathname?: string;
  };
  path: string;
  query?: StringMap;
  disabled?: boolean;
  to?: StringMap;
  className?: string;
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
  const pathname = path || get(props.to, 'pathname') || location.pathname;

  // Add support for querystring as object
  const search =
    query || get(props.to, 'query')
      ? fromQuery({
          ...toQuery(location.search),
          ...query,
          ...get(props.to, 'query')
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

export function getKibanaHref(kibanaLinkArgs: KibanaLinkArgs): string {
  const { location, pathname, hash, query = {} } = kibanaLinkArgs;
  // Preserve current _g and _a
  const currentQuery = toQuery(location.search);
  const g = decodeAndMergeG(currentQuery._g, query._g);
  const nextQuery = {
    ...query,
    _g: rison.encode(g),
    _a: query._a ? rison.encode(query._a) : ''
  };

  const search = stringifyWithoutEncoding(nextQuery);
  const href = url.format({
    pathname: chrome.addBasePath(pathname),
    hash: `${hash}?${search}`
  });
  return href;
}

// TODO:
// Both KibanaLink and RelativeLink does similar things, are too magic, and have different APIs.
// The initial idea with KibanaLink was to automatically preserve the timestamp (_g) when making links. RelativeLink went a bit overboard and preserves all query args
// The two components have different APIs: `path` vs `pathname` and one uses EuiLink the other react-router's Link (which behaves differently)
// Suggestion: Deprecate RelativeLink, and clean up KibanaLink

export interface QueryWithG extends StringMap {
  _g?: StringMap;
}

export interface KibanaLinkArgs {
  location: {
    search?: string;
    pathname?: string;
  };
  pathname: string;
  hash?: string;
  query?: QueryWithG;
  disabled?: boolean;
  to?: StringMap;
  className?: string;
}

/**
 * NOTE: Use this component directly if you have to use a link that is
 * going to be rendered outside of React, e.g. in the Kibana global toast loader.
 *
 * You must remember to pass in location in that case.
 */
export const UnconnectedKibanaLink: React.SFC<KibanaLinkArgs> = ({
  location,
  pathname,
  hash,
  query = {},
  ...props
}) => {
  const href = getKibanaHref({
    location,
    pathname,
    hash,
    query
  });
  return <EuiLink {...props} href={href} />;
};

const withLocation = connect(
  ({ location }: { location: any }) => ({ location }),
  {}
);
export const RelativeLink = withLocation(RelativeLinkComponent);
export const KibanaLink = withLocation(UnconnectedKibanaLink);

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
