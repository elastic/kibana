/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { PackageCustomExtensionComponentProps, pagePathGetters } from '@kbn/fleet-plugin/public';
import { INTEGRATIONS_PLUGIN_ID } from '@kbn/fleet-plugin/common';
import { ListPageRouteState } from '../../../../../../../../common/endpoint/types';
import { useToasts } from '../../../../../../../common/lib/kibana';
import { useAppUrl } from '../../../../../../../common/lib/kibana/hooks';
import { LinkWithIcon } from './link_with_icon';
import { ExceptionItemsSummary } from './exception_items_summary';
import { StyledEuiFlexGridGroup, StyledEuiFlexGridItem } from './styled_components';
import { useSummaryArtifact } from '../../../../../../hooks/artifacts';
import { ExceptionsListApiClient } from '../../../../../../services/exceptions_list/exceptions_list_api_client';
import { useTestIdGenerator } from '../../../../../../components/hooks/use_test_id_generator';

const ARTIFACTS_LABELS = {
  artifactsSummaryApiError: (error: string) =>
    i18n.translate('xpack.securitySolution.endpoint.fleetCustomExtension.artifactsSummaryError', {
      defaultMessage: 'There was an error trying to fetch artifacts stats: "{error}"',
      values: { error },
    }),
  cardTitle: (
    <FormattedMessage
      id="xpack.securitySolution.endpoint.fleetCustomExtension.title"
      defaultMessage="Artifacts"
    />
  ),
};

export type ARTIFACTS_LABELS_TYPE = typeof ARTIFACTS_LABELS;

type FleetArtifactsCardProps = PackageCustomExtensionComponentProps & {
  artifactApiClientInstance: ExceptionsListApiClient;
  getArtifactsPath: () => string;
  labels?: ARTIFACTS_LABELS_TYPE;
  'data-test-subj': string;
};

export const FleetArtifactsCard = memo<FleetArtifactsCardProps>(
  ({
    pkgkey,
    artifactApiClientInstance,
    getArtifactsPath,
    labels = ARTIFACTS_LABELS,
    'data-test-subj': dataTestSubj,
  }) => {
    const { getAppUrl } = useAppUrl();
    const toasts = useToasts();
    const artifactsListUrlPath = getArtifactsPath();
    const getTestId = useTestIdGenerator(dataTestSubj);

    const { data } = useSummaryArtifact(artifactApiClientInstance, {}, [], {
      onError: (error) => toasts.addDanger(labels.artifactsSummaryApiError(error.message)),
    });

    const artifactsRouteState = useMemo<ListPageRouteState>(() => {
      const fleetPackageCustomUrlPath = `#${
        pagePathGetters.integration_details_custom({ pkgkey })[1]
      }`;
      return {
        backButtonLabel: i18n.translate(
          'xpack.securitySolution.endpoint.fleetCustomExtension.backButtonLabel',
          { defaultMessage: 'Return to Endpoint Security integrations' }
        ),
        onBackButtonNavigateTo: [
          INTEGRATIONS_PLUGIN_ID,
          {
            path: fleetPackageCustomUrlPath,
          },
        ],
        backButtonUrl: getAppUrl({
          appId: INTEGRATIONS_PLUGIN_ID,
          path: fleetPackageCustomUrlPath,
        }),
      };
    }, [getAppUrl, pkgkey]);

    return (
      <EuiPanel hasShadow={false} paddingSize="l" hasBorder data-test-subj={getTestId('fleetCard')}>
        <StyledEuiFlexGridGroup alignItems="baseline" justifyContent="center">
          <StyledEuiFlexGridItem gridarea="title" alignitems="flex-start">
            <EuiText>
              <h4>{labels.cardTitle}</h4>
            </EuiText>
          </StyledEuiFlexGridItem>
          <StyledEuiFlexGridItem gridarea="summary">
            <ExceptionItemsSummary stats={data} />
          </StyledEuiFlexGridItem>
          <StyledEuiFlexGridItem gridarea="link" alignitems="flex-end">
            <>
              <LinkWithIcon
                href={getAppUrl({
                  path: artifactsListUrlPath,
                })}
                appPath={artifactsListUrlPath}
                appState={artifactsRouteState}
                data-test-subj={getTestId('artifactsLink')}
              >
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.fleetCustomExtension.manageArtifactsLinkLabel"
                  defaultMessage="Manage"
                />
              </LinkWithIcon>
            </>
          </StyledEuiFlexGridItem>
        </StyledEuiFlexGridGroup>
      </EuiPanel>
    );
  }
);

FleetArtifactsCard.displayName = 'FleetArtifactsCard';
