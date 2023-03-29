/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AppContextConsumer } from '../app_context';

export const renderDiscoverLink = (indexName: string) => {
  return (
    <AppContextConsumer>
      {(ctx) => {
        const locators = ctx?.url?.locators.get('DISCOVER_APP_LOCATOR');

        if (!locators) {
          return null;
        }
        const onClick = async () => {
          await locators.navigate({ dataViewSpec: { title: indexName } });
        };
        return (
          <EuiToolTip
            content={i18n.translate('xpack.idxMgmt.goToDiscover', {
              defaultMessage: 'Show {indexName} in Discover',
              values: { indexName },
            })}
          >
            <EuiButtonIcon
              onClick={onClick}
              display="empty"
              size="xs"
              iconType="discoverApp"
              aria-label="Discover"
              data-test-subj="indexDetailFlyoutDiscover"
              css={{ margin: '0 0.3em' }}
            />
          </EuiToolTip>
        );
      }}
    </AppContextConsumer>
  );
};
