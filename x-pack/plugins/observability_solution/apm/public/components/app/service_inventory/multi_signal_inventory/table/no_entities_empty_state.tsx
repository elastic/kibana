/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiCallOut,
  EuiLink,
  EuiEmptyPrompt,
  EuiImage,
  EuiHorizontalRule,
  EuiText,
  EuiTextColor,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { dashboardsLight } from '@kbn/shared-svg';
import { useApmPluginContext } from '../../../../../context/apm_plugin/use_apm_plugin_context';
import { useLocalStorage } from '../../../../../hooks/use_local_storage';
import {
  AddApmAgent,
  AssociateServiceLogs,
  CollectServiceLogs,
} from '../../../../shared/add_data_buttons/buttons';

export function NoEntitiesEmptyState() {
  const { core } = useApmPluginContext();
  const { basePath } = core.http;
  const [userHasDismissedCallout, setUserHasDismissedCallout] = useLocalStorage(
    'apm.uiNewExperienceCallout',
    false
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiEmptyPrompt
          hasShadow={false}
          hasBorder={false}
          id="apmNewExperienceEmptyState"
          icon={<EuiImage size="fullWidth" src={dashboardsLight} alt="" />}
          title={
            <h2>
              {i18n.translate('xpack.apm.noEntitiesEmptyState.title', {
                defaultMessage: 'No services available.',
              })}
            </h2>
          }
          layout="horizontal"
          color="plain"
          body={
            <>
              <p>
                {i18n.translate('xpack.apm.noEntitiesEmptyState.body.description', {
                  defaultMessage:
                    'The services inventory provides an overview of the health and general performance of your services. To add data to this page, instrument your services using the APM agent or detect services from your logs.',
                })}
              </p>
              <EuiHorizontalRule margin="m" />
              <EuiText textAlign="left">
                <h5>
                  <EuiTextColor color="default">
                    {i18n.translate('xpack.apm.noEntitiesEmptyState.actions.title', {
                      defaultMessage: 'Start observing your services:',
                    })}
                  </EuiTextColor>
                </h5>
              </EuiText>
            </>
          }
          actions={
            <EuiFlexGroup responsive={false} wrap gutterSize="xl" direction="column">
              <EuiFlexGroup direction="row" gutterSize="xs">
                <AddApmAgent basePath={basePath} />
                <AssociateServiceLogs />
                <CollectServiceLogs basePath={basePath} />
              </EuiFlexGroup>

              {!userHasDismissedCallout && (
                <EuiFlexItem>
                  <EuiCallOut
                    css={{ textAlign: 'left' }}
                    onDismiss={() => setUserHasDismissedCallout(true)}
                    title={i18n.translate('xpack.apm.noEntitiesEmptyState.callout.title', {
                      defaultMessage: 'Trying for the first time?',
                    })}
                  >
                    <p>
                      {i18n.translate('xpack.apm.noEntitiesEmptyState.description', {
                        defaultMessage:
                          'It can take up to a couple of minutes for your services to show. Try refreshing the page in a minute. ',
                      })}
                    </p>
                    <EuiLink
                      external
                      target="_blank"
                      data-test-subj="apmNewExperienceEmptyStateLink"
                      href="https://ela.st/elastic-entity-model-first-time"
                    >
                      {i18n.translate('xpack.apm.noEntitiesEmptyState.learnMore.link', {
                        defaultMessage: 'Learn more',
                      })}
                    </EuiLink>
                  </EuiCallOut>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
