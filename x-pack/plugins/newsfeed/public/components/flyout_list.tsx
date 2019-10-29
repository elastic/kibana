/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useContext } from 'react';
import {
  EuiIcon,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiLink,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiText,
  EuiBadge,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiHeaderAlert } from './header_alert/header_alert';
import { NewsfeedContext } from './newsfeed_header_nav_button';

export const NewsfeedFlyout = () => {
  const { setFlyoutVisible } = useContext(NewsfeedContext);
  const closeFlyout = useCallback(() => setFlyoutVisible(false), []);
  return (
    <EuiFlyout onClose={closeFlyout} size="s" aria-labelledby="flyoutSmallTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="flyoutSmallTitle">What's new</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiHeaderAlert
          title="Control access to features"
          text="Show or hide applications and features per space in Kibana."
          action={<EuiLink href="/guides/feature-controls">Learn about feature controls</EuiLink>}
          date="1 May 2019"
          badge={<EuiBadge>7.1</EuiBadge>}
        />
        <EuiHeaderAlert
          title="Kibana 7.0 is turning heads"
          text="Simplified navigation, responsive dashboards, dark mode… pick your favorite."
          action={
            <EuiLink target="_blank" href="https://www.elastic.co/blog/kibana-7-0-0-released">
              Read the blog <EuiIcon type="popout" size="s" />
            </EuiLink>
          }
          date="10 April 2019"
          badge={<EuiBadge color="hollow">7.0</EuiBadge>}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
              <FormattedMessage
                id="newsfeed.components.flyoutList.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText color="subdued" size="s">
              <p>Version 7.0</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
