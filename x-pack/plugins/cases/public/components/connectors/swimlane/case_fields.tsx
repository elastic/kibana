/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCallOut } from '@elastic/eui';
import * as i18n from './translations';

import { ConnectorTypes, SwimlaneFieldsType } from '../../../../common/api';
import { ConnectorFieldsProps } from '../types';
import { ConnectorCard } from '../card';
import { connectorValidator } from './validator';

const SwimlaneComponent: React.FunctionComponent<ConnectorFieldsProps<SwimlaneFieldsType>> = ({
  connector,
  isEdit = true,
}) => {
  const showMappingWarning = useMemo(() => connectorValidator(connector) != null, [connector]);

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
        <EuiCallOut
          title={i18n.EMPTY_MAPPING_WARNING_TITLE}
          color="danger"
          iconType="alert"
          data-test-subj="mapping-warning-callout"
        >
          {i18n.EMPTY_MAPPING_WARNING_DESC}
        </EuiCallOut>
      )}
    </>
  );
};
SwimlaneComponent.displayName = 'Swimlane';

// eslint-disable-next-line import/no-default-export
export { SwimlaneComponent as default };
