/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCallOut } from '@elastic/eui';
import * as i18n from './translations';

import type { ConnectorFieldsProps } from '../types';
import { connectorValidator } from './validator';

const SwimlaneFieldsComponent: React.FunctionComponent<ConnectorFieldsProps> = ({ connector }) => {
  const showMappingWarning = useMemo(() => connectorValidator(connector) != null, [connector]);

  return (
    <>
      {showMappingWarning && (
        <EuiCallOut
          title={i18n.EMPTY_MAPPING_WARNING_TITLE}
          color="danger"
          iconType="warning"
          data-test-subj="mapping-warning-callout"
        >
          {i18n.EMPTY_MAPPING_WARNING_DESC}
        </EuiCallOut>
      )}
    </>
  );
};

SwimlaneFieldsComponent.displayName = 'SwimlaneFields';

// eslint-disable-next-line import/no-default-export
export { SwimlaneFieldsComponent as default };
