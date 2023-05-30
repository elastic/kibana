/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { useKibana } from '../../../common/lib/kibana';
import type { ConnectorFieldsPreviewProps } from '../types';
import { useGetIncidentTypes } from './use_get_incident_types';
import { useGetSeverity } from './use_get_severity';

import * as i18n from './translations';
import type { ResilientFieldsType } from '../../../../common/api';
import { ConnectorTypes } from '../../../../common/api';
import { ConnectorCard } from '../card';

const ResilientFieldsComponent: React.FunctionComponent<
  ConnectorFieldsPreviewProps<ResilientFieldsType>
> = ({ connector, fields }) => {
  const { incidentTypes = null, severityCode = null } = fields ?? {};
  const { http } = useKibana().services;

  const {
    isLoading: isLoadingIncidentTypesData,
    isFetching: isFetchingIncidentTypesData,
    data: allIncidentTypesData,
  } = useGetIncidentTypes({
    http,
    connector,
  });

  const {
    isLoading: isLoadingSeverityData,
    isFetching: isFetchingSeverityData,
    data: severityData,
  } = useGetSeverity({
    http,
    connector,
  });

  const isLoadingIncidentTypes = isLoadingIncidentTypesData || isFetchingIncidentTypesData;
  const isLoadingSeverity = isLoadingSeverityData || isFetchingSeverityData;

  const allIncidentTypes = allIncidentTypesData?.data;
  const severity = severityData?.data;

  const listItems = useMemo(
    () => [
      ...(incidentTypes != null && incidentTypes.length > 0
        ? [
            {
              title: i18n.INCIDENT_TYPES_LABEL,
              description: (allIncidentTypes ?? [])
                .filter((type) => incidentTypes.includes(type.id.toString()))
                .map((type) => type.name)
                .join(', '),
            },
          ]
        : []),
      ...(severityCode != null && severityCode.length > 0
        ? [
            {
              title: i18n.SEVERITY_LABEL,
              description:
                severity?.find((severityObj) => severityObj.id.toString() === severityCode)?.name ??
                '',
            },
          ]
        : []),
    ],
    [incidentTypes, severityCode, allIncidentTypes, severity]
  );

  return (
    <ConnectorCard
      connectorType={ConnectorTypes.resilient}
      isLoading={isLoadingIncidentTypes || isLoadingSeverity}
      listItems={listItems}
      title={connector.name}
    />
  );
};

ResilientFieldsComponent.displayName = 'ResilientFields';
// eslint-disable-next-line import/no-default-export
export { ResilientFieldsComponent as default };
