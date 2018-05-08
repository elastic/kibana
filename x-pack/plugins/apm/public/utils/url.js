/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import qs from 'querystring';
import url from 'url';
import { Link } from 'react-router-dom';
import _ from 'lodash';
import rison from 'rison-node';
import { EuiLink } from '@elastic/eui';
import createHistory from 'history/createHashHistory';
import chrome from 'ui/chrome';

export function toQuery(search) {
  return qs.parse(search.slice(1));
}

export function fromQuery(query) {
  const encodedQuery = encodeQuery(query, ['_g', '_a']);
  return stringifyWithoutEncoding(encodedQuery);
}

export function encodeQuery(query, exclude = []) {
  return _.mapValues(query, (value, key) => {
    if (exclude.includes(key)) {
      return encodeURI(value);
    }
    return qs.escape(value);
  });
}

function stringifyWithoutEncoding(query) {
  return qs.stringify(query, null, null, {
    encodeURIComponent: v => v
  });
}

export function RelativeLinkComponent({
  location,
  path,
  query,
  disabled,
  ...props
}) {
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

export function KibanaLinkComponent({
  location,
  pathname,
  hash,
  query,
  ...props
}) {
  const currentQuery = toQuery(location.search);
  const nextQuery = {
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

const withLocation = connect(({ location }) => ({ location }), {});
export const RelativeLink = withLocation(RelativeLinkComponent);
export const KibanaLink = withLocation(KibanaLinkComponent);

// This is downright horrible 😭 💔
// Angular decodes encoded url tokens like "%2F" to "/" which causes the route to change.
// It was supposedly fixed in https://github.com/angular/angular.js/commit/1b779028fdd339febaa1fff5f3bd4cfcda46cc09 but still seeing the issue
export function legacyEncodeURIComponent(url) {
  return (
    url && encodeURIComponent(url.replace(/\//g, '~2F').replace(/ /g, '~20'))
  );
}

export function legacyDecodeURIComponent(url) {
  return (
    url && decodeURIComponent(url.replace(/~2F/g, '/').replace(/~20/g, ' '))
  );
}

export function ExternalLink(props) {
  return <EuiLink target="_blank" rel="noopener noreferrer" {...props} />;
}

ExternalLink.propTypes = {
  href: PropTypes.string.isRequired
};

// Make history singleton available across APM project.
// This is not great. Other options are to use context or withRouter helper
// React Context API is unstable and will change soon-ish (probably 16.3)
// withRouter helper from react-router overrides several props (eg. `location`) which makes it less desireable
export const history = createHistory();
