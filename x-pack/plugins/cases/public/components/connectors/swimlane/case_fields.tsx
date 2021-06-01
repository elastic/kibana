/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCallOut } from '@elastic/eui';
import * as i18n from './translations';

import { SwimlaneFieldsType } from '../../../../common';
import { ConnectorFieldsProps } from '../types';

const casesRequiredFields = ['caseNameConfig', 'descriptionConfig', 'commentsConfig'];
const isMappingEmpty = (mapping: Record<string, unknown> | undefined) =>
  !casesRequiredFields.every((field) => mapping != null && mapping[field] != null);

const SwimlaneComponent: React.FunctionComponent<ConnectorFieldsProps<SwimlaneFieldsType>> = ({
  connector,
}) => {
  const {
    config: { mappings },
  } = connector;
  const showMappingWarning = useMemo(() => isMappingEmpty(mappings), [mappings]);
  return (
    <>
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
