/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { EuiBadge, EuiFlexGroup, EuiPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { IntegrationActionsMenu } from './integration_actions_menu';
import {
  datasetCreatedOnText,
  datasetLastActivityText,
  integrationNameText,
  integrationVersionText,
} from '../../../../common/translations';
import { FieldsList } from './fields_list';
import { useDatasetQualityDetailsState } from '../../../hooks';
import { IntegrationIcon } from '../../common';

export function DatasetSummary() {
  const { fieldFormats, dataStreamSettings, dataStreamDetails, loadingState, integrationDetails } =
    useDatasetQualityDetailsState();
  const dataFormatter = fieldFormats.getDefaultInstance(KBN_FIELD_TYPES.DATE, [
    ES_FIELD_TYPES.DATE,
  ]);
  const {
    dataStreamDetailsLoading,
    dataStreamSettingsLoading,
    integrationDetailsLoadings,
    integrationDashboardsLoading,
  } = loadingState;
  const formattedLastActivity = dataStreamDetails?.lastActivity
    ? dataFormatter.convert(dataStreamDetails?.lastActivity)
    : '-';
  const formattedCreatedOn = dataStreamSettings?.createdOn
    ? dataFormatter.convert(dataStreamSettings.createdOn)
    : '-';

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
      <Fragment>
        <FieldsList
          fields={[
            ...(integrationDetails?.integration
              ? [
                  {
                    fieldTitle: integrationNameText,
                    fieldValue: (
                      <EuiBadge
                        color="hollow"
                        css={css`
                          width: fit-content;
                        `}
                      >
                        <EuiFlexGroup gutterSize="xs" alignItems="center">
                          <IntegrationIcon integration={integrationDetails.integration} />
                          <EuiText size="s">{integrationDetails.integration?.name}</EuiText>
                        </EuiFlexGroup>
                      </EuiBadge>
                    ),
                    actionsMenu: (
                      <IntegrationActionsMenu
                        integration={integrationDetails.integration}
                        dashboards={integrationDetails.dashboard}
                        dashboardsLoading={integrationDashboardsLoading}
                      />
                    ),
                    isLoading: integrationDetailsLoadings,
                  },
                  {
                    fieldTitle: integrationVersionText,
                    fieldValue: integrationDetails.integration?.version,
                    isLoading: integrationDetailsLoadings,
                  },
                ]
              : []),
            {
              fieldTitle: datasetLastActivityText,
              fieldValue: formattedLastActivity,
              isLoading: dataStreamDetailsLoading,
            },
            {
              fieldTitle: datasetCreatedOnText,
              fieldValue: formattedCreatedOn,
              isLoading: dataStreamSettingsLoading,
            },
          ]}
        />
      </Fragment>
    </EuiPanel>
  );
}
