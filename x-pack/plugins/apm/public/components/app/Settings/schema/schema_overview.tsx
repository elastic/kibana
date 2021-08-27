/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { APMLink } from '../../../shared/Links/apm/APMLink';
import { ElasticDocsLink } from '../../../shared/Links/ElasticDocsLink';
import { useFleetCloudAgentPolicyHref } from '../../../shared/Links/kibana';
import rocketLaunchGraphic from './blog-rocket-720x420.png';
import { MigrationInProgressPanel } from './migration_in_progress_panel';

interface Props {
  onSwitch: () => void;
  isMigrating: boolean;
  isMigrated: boolean;
  isLoading: boolean;
  isLoadingConfirmation: boolean;
  cloudApmMigrationEnabled: boolean;
  hasCloudAgentPolicy: boolean;
  hasRequiredRole: boolean;
}
export function SchemaOverview({
  onSwitch,
  isMigrating,
  isMigrated,
  isLoading,
  isLoadingConfirmation,
  cloudApmMigrationEnabled,
  hasCloudAgentPolicy,
  hasRequiredRole,
}: Props) {
  const fleetCloudAgentPolicyHref = useFleetCloudAgentPolicyHref();
  const isDisabled =
    !cloudApmMigrationEnabled || !hasCloudAgentPolicy || !hasRequiredRole;

  if (isLoading) {
    return (
      <>
        <SchemaOverviewHeading />
        <EuiFlexGroup justifyContent="center">
          <EuiLoadingSpinner size="xl" />
        </EuiFlexGroup>
      </>
    );
  }

  if (isMigrating && !isMigrated) {
    return (
      <>
        <SchemaOverviewHeading />
        <MigrationInProgressPanel />
      </>
    );
  }

  if (isMigrated) {
    return (
      <>
        <SchemaOverviewHeading />
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem />
          <EuiFlexItem grow={2}>
            <EuiCard
              icon={
                <EuiIcon
                  size="xxl"
                  type="checkInCircleFilled"
                  color="success"
                />
              }
              title={i18n.translate('xpack.apm.settings.schema.success.title', {
                defaultMessage: 'Data streams successfully setup!',
              })}
              description={i18n.translate(
                'xpack.apm.settings.schema.success.description',
                {
                  defaultMessage:
                    'Your APM integration is now setup and ready to receive data from your currently instrumented agents. Feel free to review the policies applied to your integtration.',
                }
              )}
              footer={
                <div>
                  <EuiButton href={fleetCloudAgentPolicyHref}>
                    {i18n.translate(
                      'xpack.apm.settings.schema.success.viewIntegrationInFleet.buttonText',
                      { defaultMessage: 'View the APM integration in Fleet' }
                    )}
                  </EuiButton>
                  <EuiSpacer size="xs" />
                  <EuiText size="s">
                    <p>
                      <FormattedMessage
                        id="xpack.apm.settings.schema.success.returnText"
                        defaultMessage="or simply return to the {serviceInventoryLink}."
                        values={{
                          serviceInventoryLink: (
                            <APMLink path="/services">
                              {i18n.translate(
                                'xpack.apm.settings.schema.success.returnText.serviceInventoryLink',
                                { defaultMessage: 'Service inventory' }
                              )}
                            </APMLink>
                          ),
                        }}
                      />
                    </p>
                  </EuiText>
                </div>
              }
            />
          </EuiFlexItem>
          <EuiFlexItem />
        </EuiFlexGroup>
      </>
    );
  }

  return (
    <>
      <SchemaOverviewHeading />
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem />
        <EuiFlexItem style={{ minWidth: '250px' }}>
          <EuiCard
            icon={<EuiIcon size="xxl" type="documents" />}
            title={i18n.translate(
              'xpack.apm.settings.schema.migrate.classicIndices.title',
              { defaultMessage: 'Classic APM indices' }
            )}
            display="subdued"
            description={i18n.translate(
              'xpack.apm.settings.schema.migrate.classicIndices.description',
              {
                defaultMessage:
                  'You are currently using classic APM indices for your data. This data schema is going away and is being replaced by data streams in Elastic Stack version 8.0.',
              }
            )}
            footer={
              <div>
                <EuiText size="s" color="subdued">
                  <p>
                    {i18n.translate(
                      'xpack.apm.settings.schema.migrate.classicIndices.currentSetup',
                      { defaultMessage: 'Current setup' }
                    )}
                  </p>
                </EuiText>
              </div>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: '250px' }}>
          <EuiCard
            betaBadgeLabel={i18n.translate(
              'xpack.apm.settings.schema.migrate.dataStreams.betaBadge.label',
              { defaultMessage: 'Beta' }
            )}
            betaBadgeTitle={i18n.translate(
              'xpack.apm.settings.schema.migrate.dataStreams.betaBadge.title',
              { defaultMessage: 'Data streams' }
            )}
            betaBadgeTooltipContent={i18n.translate(
              'xpack.apm.settings.schema.migrate.dataStreams.betaBadge.description',
              {
                defaultMessage:
                  'The switch to data streams is not GA. Please help us by reporting any bugs.',
              }
            )}
            image={
              <div>
                <img src={rocketLaunchGraphic} alt="rocket launch" />
              </div>
            }
            title={i18n.translate(
              'xpack.apm.settings.schema.migrate.dataStreams.title',
              { defaultMessage: 'Data streams' }
            )}
            description={i18n.translate(
              'xpack.apm.settings.schema.migrate.dataStreams.description',
              {
                defaultMessage:
                  'Going forward, any newly ingested data gets stored in data streams. Previously ingested data remains in classic APM indices. The APM and UX apps will continue to support both indices.',
              }
            )}
            footer={
              <div>
                <EuiToolTip
                  position="bottom"
                  content={getDisabledReason({
                    cloudApmMigrationEnabled,
                    hasCloudAgentPolicy,
                    hasRequiredRole,
                  })}
                >
                  <EuiButton
                    fill
                    isLoading={isLoadingConfirmation}
                    isDisabled={isDisabled}
                  >
                    {i18n.translate(
                      'xpack.apm.settings.schema.migrate.dataStreams.buttonText',
                      { defaultMessage: 'Switch to data streams' }
                    )}
                  </EuiButton>
                </EuiToolTip>
              </div>
            }
            onClick={onSwitch}
            isDisabled={isDisabled}
          />
        </EuiFlexItem>
        <EuiFlexItem />
      </EuiFlexGroup>
    </>
  );
}

export function SchemaOverviewHeading() {
  return (
    <>
      <EuiText color="subdued">
        <FormattedMessage
          id="xpack.apm.settings.schema.descriptionText"
          defaultMessage="We have created a simple and seamless process for switching from the classic APM indices to immediately take advantage of the new data streams features. Beware this action is {irreversibleEmphasis} and can only be performed by a {superuserEmphasis} with access to Fleet. Learn more about {dataStreamsDocLink}."
          values={{
            irreversibleEmphasis: (
              <strong>
                {i18n.translate(
                  'xpack.apm.settings.schema.descriptionText.irreversibleEmphasisText',
                  { defaultMessage: 'irreversible' }
                )}
              </strong>
            ),
            superuserEmphasis: (
              <strong>
                {i18n.translate(
                  'xpack.apm.settings.schema.descriptionText.superuserEmphasisText',
                  { defaultMessage: 'superuser' }
                )}
              </strong>
            ),
            dataStreamsDocLink: (
              <ElasticDocsLink
                section="/apm/server"
                path="/apm-integration-data-streams.html"
                target="_blank"
              >
                {i18n.translate(
                  'xpack.apm.settings.schema.descriptionText.dataStreamsDocLinkText',
                  { defaultMessage: 'data streams' }
                )}
              </ElasticDocsLink>
            ),
          }}
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem />
        <EuiFlexItem grow={2}>
          <EuiCallOut
            size="s"
            title={i18n.translate(
              'xpack.apm.settings.schema.descriptionText.betaCalloutTitle',
              { defaultMessage: 'Data streams are beta in APM' }
            )}
            iconType="alert"
            color="warning"
          >
            {i18n.translate(
              'xpack.apm.settings.schema.descriptionText.betaCalloutMessage',
              {
                defaultMessage:
                  'This functionality is in beta and is subject to change. The design and code is less mature than official GA features and is being provided as-is with no warranties. Beta features are not subject to the support SLA of official GA features.',
              }
            )}
          </EuiCallOut>
        </EuiFlexItem>
        <EuiFlexItem />
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </>
  );
}

function getDisabledReason({
  cloudApmMigrationEnabled,
  hasCloudAgentPolicy,
  hasRequiredRole,
}: {
  cloudApmMigrationEnabled: boolean;
  hasCloudAgentPolicy: boolean;
  hasRequiredRole: boolean;
}) {
  const reasons: string[] = [];
  if (!cloudApmMigrationEnabled) {
    reasons.push(
      i18n.translate(
        'xpack.apm.settings.schema.disabledReason.cloudApmMigrationEnabled',
        { defaultMessage: 'Cloud migration is not enabled' }
      )
    );
  }
  if (!hasCloudAgentPolicy) {
    reasons.push(
      i18n.translate(
        'xpack.apm.settings.schema.disabledReason.hasCloudAgentPolicy',
        { defaultMessage: 'Cloud agent policy does not exist' }
      )
    );
  }
  if (!hasRequiredRole) {
    reasons.push(
      i18n.translate(
        'xpack.apm.settings.schema.disabledReason.hasRequiredRole',
        { defaultMessage: 'User does not have superuser role' }
      )
    );
  }
  if (reasons.length) {
    return (
      <FormattedMessage
        id="xpack.apm.settings.schema.disabledReason"
        defaultMessage="Switch to data streams is unavailable: {reasons}"
        values={{
          reasons: (
            <ul>
              {reasons.map((reasonText, index) => (
                <li key={index}>- {reasonText}</li>
              ))}
            </ul>
          ),
        }}
      />
    );
  }
}
