/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAppContext } from '../app_context';

export const DiscoverLink = ({
  indexName,
  asButton = false,
}: {
  indexName: string;
  asButton?: boolean;
}) => {
  const { url } = useAppContext();
  const discoverLocator = url?.locators.get('DISCOVER_APP_LOCATOR');
  if (!discoverLocator) {
    return null;
  }
  const onClick = async () => {
    await discoverLocator.navigate({ dataViewSpec: { title: indexName } });
  };

  let link = (
    <EuiButtonIcon
      onClick={onClick}
      display="empty"
      size="xs"
      iconType="discoverApp"
      aria-label="Discover"
      data-test-subj="discoverIconLink"
      css={{ margin: '0 0.3em' }}
    />
  );
  if (asButton) {
    link = (
      <EuiButton fill onClick={onClick} iconType="discoverApp" data-test-subj="discoverButtonLink">
        <FormattedMessage
          id="xpack.idxMgmt.goToDiscover.discoverIndexButtonLabel"
          defaultMessage="Discover index"
        />
      </EuiButton>
    );
  }

  return (
    <EuiToolTip
      content={i18n.translate('xpack.idxMgmt.goToDiscover.showIndexToolTip', {
        defaultMessage: 'Show {indexName} in Discover',
        values: { indexName },
      })}
    >
      {link}
    </EuiToolTip>
  );
};
