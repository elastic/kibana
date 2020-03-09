/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { stringify } from 'query-string';
import url from 'url';
import { url as urlUtils } from '../../../../../src/plugins/kibana_utils/public';
import { usePrefixPathWithBasepath } from './use_prefix_path_with_basepath';
import { useHistory } from '../utils/history_context';

type Search = Record<string, string | string[]>;

export interface LinkDescriptor {
  app: string;
  pathname?: string;
  hash?: string;
  search?: Search;
}

interface LinkProps {
  href?: string;
  onClick?: (e: React.MouseEvent | React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
}

export const useLinkProps = ({ app, pathname, hash, search }: LinkDescriptor): LinkProps => {
  validateParams({ app, pathname, hash, search });

  const history = useHistory();
  const prefixer = usePrefixPathWithBasepath();

  const encodedSearch = useMemo(() => {
    return search ? encodeSearch(search) : undefined;
  }, [search]);

  const internalLinkResult = useMemo(() => {
    // When the logs / metrics apps are first mounted a history instance is setup with a 'basename' equal to the
    // 'appBasePath' received from Core's 'AppMountParams', e.g. /BASE_PATH/s/SPACE_ID/app/APP_ID. With internal
    // linking we are using 'createHref' and 'push' on top of this history instance. So a pathname of /inventory used within
    // the metrics app will ultimatey end up as /BASE_PATH/s/SPACE_ID/app/metrics/inventory. React-router responds to this
    // as it is instantiated with the same history instance.
    return history?.createHref({
      pathname: pathname ? formatPathname(pathname) : undefined,
      search: encodedSearch,
    });
  }, [history, pathname, encodedSearch]);

  const externalLinkResult = useMemo(() => {
    // The URI spec defines that the query should appear before the fragment
    // https://tools.ietf.org/html/rfc3986#section-3 (e.g. url.format()). However, in Kibana, apps that use
    // hash based routing expect the query to be part of the hash. This will handle that.
    const mergedHash = hash && encodedSearch ? `${hash}?${encodedSearch}` : hash;

    const link = url.format({
      pathname,
      hash: mergedHash,
      search: !hash ? encodedSearch : undefined,
    });

    return prefixer(app, link);
  }, [hash, encodedSearch, pathname, prefixer, app]);

  const onClick = useMemo(() => {
    // If these results are equal we know we're trying to navigate within the same application
    // that the current history instance is representing
    if (internalLinkResult && linksAreEquivalent(externalLinkResult, internalLinkResult)) {
      return (e: React.MouseEvent | React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
        e.preventDefault();
        if (history) {
          history.push({
            pathname: pathname ? formatPathname(pathname) : undefined,
            search: encodedSearch,
          });
        }
      };
    } else {
      return undefined;
    }
  }, [internalLinkResult, externalLinkResult, history, pathname, encodedSearch]);

  return {
    href: externalLinkResult,
    onClick,
  };
};

const encodeSearch = (search: Search) => {
  return stringify(urlUtils.encodeQuery(search), { sort: false, encode: false });
};

const formatPathname = (pathname: string) => {
  return pathname[0] === '/' ? pathname : `/${pathname}`;
};

const validateParams = ({ app, pathname, hash, search }: LinkDescriptor) => {
  if (!app && hash) {
    throw new Error(
      'The metrics and logs apps use browserHistory. Please provide a pathname rather than a hash.'
    );
  }
};

const linksAreEquivalent = (externalLink: string, internalLink: string): boolean => {
  // Compares with trailing slashes removed. This handles the case where the pathname is '/'
  // and 'createHref' will include the '/' but Kibana's 'getUrlForApp' will remove it.
  return externalLink.replace(/\/$/, '') === internalLink.replace(/\/$/, '');
};
