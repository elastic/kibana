/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect } from 'react';

import {
  EuiSteps,
  EuiText,
  EuiPageHeader,
  EuiButtonEmpty,
  EuiSpacer,
  EuiLink,
  EuiPageBody,
  EuiPageContent,
  EuiFlexItem,
  EuiButton,
  EuiFlexGroup,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { useAppContext } from '../../app_context';
import { getReviewLogsStep } from './review_logs_step';
import { getFixDeprecationLogsStep } from './fix_deprecation_logs_step';
import { getUpgradeStep } from './upgrade_step';

export const Overview: FunctionComponent = () => {
  const { kibanaVersionInfo, breadcrumbs, docLinks, api } = useAppContext();
  const { currentMajor } = kibanaVersionInfo;

  useEffect(() => {
    async function sendTelemetryData() {
      await api.sendTelemetryData({
        overview: true,
      });
    }

    sendTelemetryData();
  }, [api]);

  useEffect(() => {
    breadcrumbs.setBreadcrumbs('overview');
  }, [breadcrumbs]);

  return (
    <EuiPageBody restrictWidth={true}>
      <EuiPageContent horizontalPosition="center" color="transparent" paddingSize="none">
        <EuiPageHeader
          bottomBorder
          pageTitle={i18n.translate('xpack.upgradeAssistant.overview.pageTitle', {
            defaultMessage: '8.0 Upgrade Assistant',
          })}
          description={i18n.translate('xpack.upgradeAssistant.overview.pageDescription', {
            defaultMessage: 'Get ready for the next version of the Elastic Stack!',
          })}
          rightSideItems={[
            <EuiButtonEmpty
              href={docLinks.links.upgradeAssistant}
              target="_blank"
              iconType="help"
              data-test-subj="documentationLink"
            >
              <FormattedMessage
                id="xpack.upgradeAssistant.overview.documentationLinkText"
                defaultMessage="Documentation"
              />
            </EuiButtonEmpty>,
          ]}
        >
          <EuiText>
            <EuiLink href={docLinks.links.elasticsearch.releaseHighlights} target="_blank">
              <FormattedMessage
                id="xpack.upgradeAssistant.overview.whatsNewLink"
                defaultMessage="What's new in version {currentMajor}.0?"
                values={{ currentMajor }}
              />
            </EuiLink>
          </EuiText>
        </EuiPageHeader>

        <EuiSpacer size="l" />

        <EuiSteps
          steps={[
            {
              title: 'Back up your data before making changes',
              status: 'complete',
              children: (
                <>
                  <EuiFlexGroup alignItems="center" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="check" color="success" />
                    </EuiFlexItem>

                    <EuiFlexItem grow={false}>
                      <EuiText>
                        <p>
                          Snapshot saved <a href="#">September 5, 2021 3:59 PM PDT</a>
                        </p>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  <EuiSpacer size="m" />

                  <EuiButton
                    href="#"
                    target="_blank"
                    iconSide="right"
                    iconType="popout"
                  >
                    Create snapshot
                  </EuiButton>
                </>
              ),
            },
            getReviewLogsStep({ currentMajor }),
            getFixDeprecationLogsStep(),
            getUpgradeStep({ docLinks, currentMajor }),
          ]}
        />
      </EuiPageContent>
    </EuiPageBody>
  );
};
