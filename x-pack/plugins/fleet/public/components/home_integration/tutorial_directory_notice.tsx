/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import styled from 'styled-components';

import type { TutorialDirectoryNoticeComponent } from '../../../../../../src/plugins/home/public/services/tutorials/tutorial_service';
import { RedirectAppLinks } from '../../../../../../src/plugins/kibana_react/public/app_links/redirect_app_link';
import { useCapabilities } from '../../hooks/use_capabilities';
import { useStartServices } from '../../hooks/use_core';
import { useLink } from '../../hooks/use_link';
import { sendPutSettings, useGetSettings } from '../../hooks/use_request/settings';

const FlexItemButtonWrapper = styled(EuiFlexItem)`
  &&& {
    margin-bottom: 0;
  }
`;

export const tutorialDirectoryNoticeState$ = new BehaviorSubject({
  settingsDataLoaded: false,
  hasSeenNotice: false,
});

const TutorialDirectoryNotice: TutorialDirectoryNoticeComponent = memo(() => {
  const { getHref } = useLink();
  const { application } = useStartServices();
  const { show: hasIngestManager } = useCapabilities();
  const { data: settingsData, isLoading } = useGetSettings();
  const [dismissedNotice, setDismissedNotice] = useState<boolean>(false);

  const dismissNotice = useCallback(async () => {
    setDismissedNotice(true);
    await sendPutSettings({
      has_seen_add_data_notice: true,
    });
  }, []);

  useEffect(() => {
    tutorialDirectoryNoticeState$.next({
      settingsDataLoaded: !isLoading,
      hasSeenNotice: Boolean(dismissedNotice || settingsData?.item?.has_seen_add_data_notice),
    });
  }, [isLoading, settingsData, dismissedNotice]);

  const hasSeenNotice =
    isLoading || settingsData?.item?.has_seen_add_data_notice || dismissedNotice;

  return hasIngestManager && !hasSeenNotice ? (
    <>
      <EuiCallOut
        iconType="cheer"
        title={
          <FormattedMessage
            id="xpack.fleet.homeIntegration.tutorialDirectory.noticeTitle"
            defaultMessage="{newPrefix} Elastic Agent integrations"
            values={{
              newPrefix: (
                <strong>
                  <FormattedMessage
                    id="xpack.fleet.homeIntegration.tutorialDirectory.noticeTitle.newPrefix"
                    defaultMessage="Now generally available:"
                  />
                </strong>
              ),
            }}
          />
        }
      >
        <p>
          <FormattedMessage
            id="xpack.fleet.homeIntegration.tutorialDirectory.noticeText"
            defaultMessage="Elastic Agent integrations provide a simple, unified way to add monitoring for logs, metrics, and other types of data to your hosts.
              You no longer need to install multiple Beats, which makes it easier and faster to deploy policies across your infrastructure.
              For more information, read our {blogPostLink}."
            values={{
              blogPostLink: (
                <EuiLink
                  href="https://ela.st/elastic-agent-ga-announcement"
                  external
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.fleet.homeIntegration.tutorialDirectory.noticeText.blogPostLink"
                    defaultMessage="announcement blog post"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
        <EuiFlexGroup gutterSize="s">
          <FlexItemButtonWrapper grow={false}>
            <div>
              <RedirectAppLinks application={application}>
                <EuiButton size="s" href={getHref('integrations')}>
                  <FormattedMessage
                    id="xpack.fleet.homeIntegration.tutorialDirectory.fleetAppButtonText"
                    defaultMessage="Try Integrations"
                  />
                </EuiButton>
              </RedirectAppLinks>
            </div>
          </FlexItemButtonWrapper>
          <FlexItemButtonWrapper grow={false}>
            <div>
              <EuiButtonEmpty
                size="s"
                onClick={() => {
                  dismissNotice();
                }}
              >
                <FormattedMessage
                  id="xpack.fleet.homeIntegration.tutorialDirectory.dismissNoticeButtonText"
                  defaultMessage="Dismiss message"
                />
              </EuiButtonEmpty>
            </div>
          </FlexItemButtonWrapper>
        </EuiFlexGroup>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  ) : null;
});

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default TutorialDirectoryNotice;
