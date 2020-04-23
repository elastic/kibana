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
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { useNavigationWarningPrompt } from '../utils/navigation_warning_prompt';

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

  const { prompt } = useNavigationWarningPrompt();
  const prefixer = usePrefixPathWithBasepath();
  const navigateToApp = useKibana().services.application?.navigateToApp;

  const encodedSearch = useMemo(() => {
    return search ? encodeSearch(search) : undefined;
  }, [search]);

  const mergedHash = useMemo(() => {
    // The URI spec defines that the query should appear before the fragment
    // https://tools.ietf.org/html/rfc3986#section-3 (e.g. url.format()). However, in Kibana, apps that use
    // hash based routing expect the query to be part of the hash. This will handle that.
    return hash && encodedSearch ? `${hash}?${encodedSearch}` : hash;
  }, [hash, encodedSearch]);

  const mergedPathname = useMemo(() => {
    return pathname && encodedSearch ? `${pathname}?${encodedSearch}` : pathname;
  }, [pathname, encodedSearch]);

  const href = useMemo(() => {
    const link = url.format({
      pathname,
      hash: mergedHash,
      search: !hash ? encodedSearch : undefined,
    });

    return prefixer(app, link);
  }, [mergedHash, hash, encodedSearch, pathname, prefixer, app]);

  const onClick = useMemo(() => {
    return (e: React.MouseEvent | React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      e.preventDefault();

      const navigate = () => {
        if (navigateToApp) {
          const navigationPath = mergedHash ? `#${mergedHash}` : mergedPathname;
          navigateToApp(app, { path: navigationPath ? navigationPath : undefined });
        }
      };

      // A <Prompt /> component somewhere within the app hierarchy is requesting that we
      // prompt the user before navigating.
      if (prompt) {
        const wantsToNavigate = window.confirm(prompt);
        if (wantsToNavigate) {
          navigate();
        } else {
          return;
        }
      } else {
        navigate();
      }
    };
  }, [navigateToApp, mergedHash, mergedPathname, app, prompt]);

  return {
    href,
    onClick,
  };
};

const encodeSearch = (search: Search) => {
  return stringify(urlUtils.encodeQuery(search), { sort: false, encode: false });
};

const validateParams = ({ app, pathname, hash, search }: LinkDescriptor) => {
  if (!app && hash) {
    throw new Error(
      'The metrics and logs apps use browserHistory. Please provide a pathname rather than a hash.'
    );
  }
};
