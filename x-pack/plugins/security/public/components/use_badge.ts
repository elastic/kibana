/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DependencyList } from 'react';
import { useEffect } from 'react';

import type { ChromeBadge } from '@kbn/core-chrome-browser';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export type { ChromeBadge };

/**
 * Renders a badge in the Kibana chrome.
 * @param badge Params of the badge or `undefined` to render no badge.
 * @param badge.iconType Icon type of the badge shown in the Kibana chrome.
 * @param badge.text Title of tooltip displayed when hovering the badge.
 * @param badge.tooltip Description of tooltip displayed when hovering the badge.
 * @param deps If present, badge will be updated or removed if the values in the list change.
 */
export function useBadge(
  badge: ChromeBadge | undefined,
  deps: DependencyList = [badge?.iconType, badge?.text, badge?.tooltip]
) {
  const { services } = useKibana<CoreStart>();

  useEffect(() => {
    if (badge) {
      services.chrome.setBadge(badge);
      return () => services.chrome.setBadge();
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}
