/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiPopover,
  EuiPopoverTitle,
  EuiPopoverFooter,
  EuiButtonEmpty,
  EuiButtonEmptyProps,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { KibanaPageTemplateProps } from '../../../../../../../src/plugins/kibana_react/public';

import { docLinks } from '../doc_links';
import { getEnterpriseSearchUrl } from '../enterprise_search_url';

import './beta.scss';

interface Props {
  buttonProps?: EuiButtonEmptyProps;
}

export const BetaNotification: React.FC<Props> = ({ buttonProps }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = () => setIsPopoverOpen((isOpen) => !isOpen);
  const closePopover = () => setIsPopoverOpen(false);

  return (
    <EuiPopover
      button={
        <EuiButtonEmpty
          size="xs"
          flush="both"
          iconType="alert"
          {...buttonProps}
          onClick={togglePopover}
        >
          {i18n.translate('xpack.enterpriseSearch.beta.buttonLabel', {
            defaultMessage: 'This is a beta user interface',
          })}
        </EuiButtonEmpty>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="rightDown"
      repositionOnScroll
    >
      <EuiPopoverTitle>
        {i18n.translate('xpack.enterpriseSearch.beta.popover.title', {
          defaultMessage: 'Enterprise Search in Kibana is a beta user interface',
        })}
      </EuiPopoverTitle>
      <div className="betaNotification">
        <EuiText size="s">
          <p>
            {i18n.translate('xpack.enterpriseSearch.beta.popover.description', {
              defaultMessage:
                'The Kibana interface for Enterprise Search is a beta feature. It is subject to change and is not covered by the same level of support as generally available features. This interface will become the sole management panel for Enterprise Search with the 8.0 release. Until then, the standalone Enterprise Search UI remains available and supported.',
            })}
          </p>
        </EuiText>
      </div>
      <EuiPopoverFooter>
        <FormattedMessage
          id="xpack.enterpriseSearch.beta.popover.footerDetail"
          defaultMessage="{learnMoreLink} or {standaloneUILink}."
          values={{
            learnMoreLink: (
              <EuiLink
                href={`${docLinks.enterpriseSearchBase}/user-interfaces.html`}
                target="_blank"
              >
                Learn more
              </EuiLink>
            ),
            standaloneUILink: (
              <EuiLink href={getEnterpriseSearchUrl()}>switch to the Enterprise Search UI</EuiLink>
            ),
          }}
        />
      </EuiPopoverFooter>
    </EuiPopover>
  );
};

export const appendBetaNotificationItem = (sideNav: KibanaPageTemplateProps['solutionNav']) => {
  if (sideNav) {
    sideNav.items.push({
      id: 'beta',
      name: '',
      renderItem: () => <BetaNotification />,
    });
  }
};
