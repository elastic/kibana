/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactElement } from 'react';
import React, { useMemo } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import type { NoArgCallback } from '@elastic/eui';
import { EuiTourStep, EuiLink, EuiText } from '@elastic/eui';
import { useTheme } from 'styled-components';

import type { EuiTheme } from '@kbn/kibana-react-plugin/common';

import type { TOUR_STORAGE_CONFIG } from '../constants';
import { TOUR_STORAGE_KEYS } from '../constants';
import { useStartServices } from '../hooks';

export const AddAgentHelpPopover = ({
  button,
  isOpen,
  offset,
  closePopover,
}: {
  button: ReactElement;
  isOpen: boolean;
  offset?: number;
  closePopover: NoArgCallback<void>;
}) => {
  const { docLinks, uiSettings, storage } = useStartServices();
  const theme = useTheme() as EuiTheme;
  const optionalProps: { offset?: number } = {};
  const hideAddAgentTour: boolean = useMemo(() => {
    return (
      uiSettings.get('hideAnnouncements', false) ||
      (
        storage.get(TOUR_STORAGE_KEYS.ADD_AGENT_POPOVER) as
          | TOUR_STORAGE_CONFIG['ADD_AGENT_POPOVER']
          | undefined
      )?.active === false
    );
  }, [storage, uiSettings]);

  const onFinish = () => {
    storage.set(TOUR_STORAGE_KEYS.ADD_AGENT_POPOVER, {
      active: false,
    } as TOUR_STORAGE_CONFIG['ADD_AGENT_POPOVER']);
  };

  if (offset !== undefined) {
    optionalProps.offset = offset; // offset being present in props sets it to 0 so only add if specified
  }

  return hideAddAgentTour ? (
    button
  ) : (
    <EuiTourStep
      {...optionalProps}
      content={
        <EuiText size="m" style={{ width: 302 }}>
          <FormattedMessage
            id="xpack.fleet.addAgentHelpPopover.popoverBody"
            defaultMessage="For integrations to work successfully, add {elasticAgent} to your host to collect data and send it to Elastic Stack. {learnMoreLink}"
            values={{
              elasticAgent: <strong>Elastic Agent</strong>,
              learnMoreLink: (
                <EuiLink target="_blank" external href={docLinks.links.fleet.elasticAgent}>
                  <FormattedMessage
                    id="xpack.fleet.addAgentHelpPopover.documentationLink"
                    defaultMessage="Learn more about Elastic Agent."
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      }
      zIndex={theme.eui.euiZLevel1 - 1} // put popover behind any modals that happen to be open
      isStepOpen={isOpen}
      minWidth={300}
      onFinish={onFinish}
      step={1}
      stepsTotal={1}
      title={
        <FormattedMessage
          id="xpack.fleet.addAgentHelpPopover.title"
          defaultMessage="Don't forget to add the agent to your host"
        />
      }
      anchorPosition="downCenter"
      subtitle={null}
      data-test-subj="addAgentHelpPopover"
      footerAction={
        <EuiLink
          onClick={() => {
            onFinish();
            closePopover();
          }}
        >
          <FormattedMessage
            id="xpack.fleet.addAgentHelpPopover.footActionButton"
            defaultMessage="Got it"
          />
        </EuiLink>
      }
    >
      {button}
    </EuiTourStep>
  );
};
