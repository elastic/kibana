/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutTemplateProps } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import { useOpenInDiscoverLink } from '../links/discover_links/open_in_discover';
import { SPAN_FLYOUT_EBT_ELEMENTS } from './ebt_constants';

const OPEN_IN_DISCOVER_LABEL = i18n.translate('xpack.apm.spanFlyout.openInDiscover', {
  defaultMessage: 'Open in Discover',
});

/**
 * Resolves the span flyout menu bar: an "Open in Discover" icon action, shown once the span has
 * loaded. It is an anchor, so modified clicks open Discover in a new tab.
 */
export function useSpanFlyoutMenuProps({
  isSpanLoaded,
  spanId,
  rangeFrom,
  rangeTo,
  kuery,
}: {
  isSpanLoaded: boolean;
  spanId: string;
  rangeFrom: string;
  rangeTo: string;
  kuery?: string;
}): FlyoutTemplateProps['flyoutMenuProps'] {
  const { href, isLoading, isDisabled, ebtProps } = useOpenInDiscoverLink({
    indexType: 'traces',
    rangeFrom,
    rangeTo,
    queryParams: { kuery, spanId, sortDirection: 'DESC' },
    ebt: { element: SPAN_FLYOUT_EBT_ELEMENTS.HEADER },
  });

  if (!isSpanLoaded) {
    return undefined;
  }

  return {
    trailingActions: [
      {
        iconType: 'productDiscover',
        href,
        'aria-label': OPEN_IN_DISCOVER_LABEL,
        toolTipContent: OPEN_IN_DISCOVER_LABEL,
        isDisabled: isLoading || isDisabled,
        hasAriaDisabled: true,
        'data-test-subj': 'spanFlyoutViewSpanInDiscoverLink',
        ...ebtProps,
      },
    ],
  };
}
