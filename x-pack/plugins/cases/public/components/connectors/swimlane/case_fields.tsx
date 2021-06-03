/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCallOut } from '@elastic/eui';
import * as i18n from './translations';

import { ConnectorTypes, SwimlaneFieldsType, SwimlaneConnectorType } from '../../../../common';
import { ConnectorFieldsProps } from '../types';
import { ConnectorCard } from '../card';

const casesRequiredFields = [
  'caseIdConfig',
  'caseNameConfig',
  'descriptionConfig',
  'commentsConfig',
];

const isAnyRequiredFieldNotSet = (mapping: Record<string, unknown> | undefined) =>
  !casesRequiredFields.some((field) => mapping != null && mapping[field] != null);

const SwimlaneComponent: React.FunctionComponent<ConnectorFieldsProps<SwimlaneFieldsType>> = ({
  connector,
  isEdit = true,
}) => {
  const {
    config: { mappings, connectorType },
  } = connector;
  const showMappingWarning = useMemo(
    /**
     * If the type of the connector is not cases
     * or there any of the required fields is not set
     * a warning message is being shown to the user
     */
    () => connectorType !== SwimlaneConnectorType.Cases || isAnyRequiredFieldNotSet(mappings),
    [mappings, connectorType]
  );

  return (
    <>
      {!isEdit && (
        <ConnectorCard
          connectorType={ConnectorTypes.swimlane}
          isLoading={false}
          listItems={[]}
          title={connector.name}
        />
      )}
      {showMappingWarning && (
        <EuiCallOut title={i18n.EMPTY_MAPPING_WARNING_TITLE} color="warning" iconType="help">
          {i18n.EMPTY_MAPPING_WARNING_DESC}
        </EuiCallOut>
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { SwimlaneComponent as default };
