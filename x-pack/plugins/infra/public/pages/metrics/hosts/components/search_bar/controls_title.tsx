/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormLabel, EuiPopover, EuiIcon, EuiToolTip, EuiLink } from '@elastic/eui';
import useToggle from 'react-use/lib/useToggle';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { availableControlsPanels } from '../../hooks/use_control_panels_url_state';

const helpMessages = {
  [availableControlsPanels.SERVICE_NAME]: {
    text: `${i18n.translate('xpack.infra.hostsViewPage.serviceNameControl.popoverHelpLabel', {
      defaultMessage: 'Services detected via',
    })}`,
    link: {
      text: `${i18n.translate('xpack.infra.hostsViewPage.serviceNameControl.popoverHelpLink', {
        defaultMessage: 'APM',
      })}`,
      href: 'https://ela.st/docs-infra-apm',
      ['data-test-subj']: 'hostsViewServiceNameControlPopoverHelpLink',
    },
  },
};

const TitleWithPopoverMessage = ({
  title,
  helpMessage,
  embeddableId,
}: {
  title?: string;
  helpMessage: {
    text: string;
    link?: {
      href: string;
      'data-test-subj': string;
      text: string;
    };
  };
  embeddableId: string;
}) => {
  const [isPopoverOpen, togglePopover] = useToggle(false);

  return helpMessage?.text ? (
    <EuiFormLabel className="controlFrame__formControlLayoutLabel" htmlFor={embeddableId}>
      <>
        {title}
        <EuiPopover
          panelPaddingSize="s"
          button={
            <EuiIcon
              data-test-subj={`control-group-help-message-${embeddableId}`}
              type="iInCircle"
              size="m"
              onClick={togglePopover}
              css={css`
                cursor: pointer;
                margin: 0 2px 2px;
              `}
            />
          }
          isOpen={isPopoverOpen}
          offset={10}
          closePopover={() => togglePopover(false)}
          repositionOnScroll
          anchorPosition="upCenter"
          panelStyle={{ maxWidth: 250 }}
        >
          {helpMessage?.link ? (
            <>
              {helpMessage.text}{' '}
              <EuiLink
                data-test-subj={helpMessage.link['data-test-subj']}
                href={helpMessage.link.href}
                target="_blank"
              >
                {helpMessage.link.text}
              </EuiLink>
            </>
          ) : (
            <>{helpMessage.text}</>
          )}
        </EuiPopover>
      </>
    </EuiFormLabel>
  ) : null;
};

export const ControlTitle = ({ title, embeddableId }: { title?: string; embeddableId: string }) => {
  const helpMessage = helpMessages[embeddableId];
  return helpMessage ? (
    <TitleWithPopoverMessage title={title} helpMessage={helpMessage} embeddableId={embeddableId} />
  ) : (
    <EuiToolTip anchorClassName="controlFrame__labelToolTip" content={title}>
      <EuiFormLabel className="controlFrame__formControlLayoutLabel" htmlFor={embeddableId}>
        {title}
      </EuiFormLabel>
    </EuiToolTip>
  );
};
