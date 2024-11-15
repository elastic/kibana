/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useDiscoverRedirect } from '../../hooks/use_discover_redirect';

export function DiscoverButton({ dataView }: { dataView: DataView }) {
  const { getDiscoverRedirectUrl } = useDiscoverRedirect();

  const discoverLink = getDiscoverRedirectUrl();

  if (!discoverLink) {
    return null;
  }

  return (
    <EuiButton
      color="text"
      iconType="discoverApp"
      href={discoverLink}
      data-test-subj="inventorySearchBarDiscoverButton"
    >
      {i18n.translate('xpack.inventory.searchBar.discoverButton', {
        defaultMessage: 'Open in discover',
      })}
    </EuiButton>
  );
}
