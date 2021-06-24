/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiCard,
  EuiIcon,
  EuiButton,
  EuiCallOut,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ElasticDocsLink } from '../../../shared/Links/ElasticDocsLink';
import rocketLaunchGraphic from './blog-rocket-720x420.png';
import { APMLink } from '../../../shared/Links/apm/APMLink';

interface Props {
  onSwitch: () => void;
  isMigrated: boolean;
  isLoading: boolean;
  isLoadingConfirmation: boolean;
  isDisabled: boolean;
}
export function SchemaOverview({
  onSwitch,
  isMigrated,
  isLoading,
  isLoadingConfirmation,
  isDisabled,
}: Props) {
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
              title={`Data streams successfully setup!`}
              description={`Your APM integration is now setup and ready to receive data from your currently instrumented agents. Feel free to review the policies applied to your integtration.`}
              footer={
                <div>
                  <EuiButton aria-label="View the APM integration in Fleet">
                    View the APM integration in Fleet
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
        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon size="xxl" type="documents" />}
            title={`Classic APM indices`}
            display="subdued"
            description={`You are currently using classic APM indices for your data. This data schema is going away and is being replaced by data streams in Elastic Stack version 8.0.`}
            footer={
              <div>
                <EuiText size="s" color="subdued">
                  <p>Current setup</p>
                </EuiText>
              </div>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            image={
              <div>
                <img src={rocketLaunchGraphic} alt="rocket launch" />
              </div>
            }
            title={`Data streams`}
            description={`Going forward, any newly ingested data gets stored in data streams. Previously ingested data remains in classic APM indices. The APM and UX apps will continue to support both indices.`}
            footer={
              <div>
                <EuiButton
                  fill
                  isLoading={isLoadingConfirmation}
                  aria-label="Switch to data streams"
                  isDisabled={isDisabled}
                >
                  Switch to data streams
                </EuiButton>
              </div>
            }
            onClick={onSwitch}
            isDisabled={isDisabled}
          />
        </EuiFlexItem>
        <EuiFlexItem />
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <EuiFlexGroup justifyContent="center" gutterSize="s">
        <EuiFlexItem />
        <EuiFlexItem grow={2}>
          <EuiCallOut title="Please note before switching" iconType="iInCircle">
            <p>
              If you have custom dashboards, machine learning jobs, or source
              maps that use classic APM indices, you must reconfigure them for
              data streams.
            </p>
          </EuiCallOut>
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
                section="/elasticsearch/reference"
                path="/data-streams.html"
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
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.apm.settings.schema.title', {
                defaultMessage: 'Schema',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </>
  );
}
