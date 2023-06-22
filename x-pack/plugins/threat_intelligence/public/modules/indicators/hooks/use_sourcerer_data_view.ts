/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { RawIndicatorFieldId } from '../../../../common/types/indicator';
import { SecuritySolutionDataViewBase } from '../../../types';
import { useSecurityContext } from '../../../hooks/use_security_context';
import { DESCRIPTION } from './translations';

/**
 * Inline definition for a runtime field "threat.indicator.name" we are adding for indicators grid
 */
const indicatorNameField = {
  aggregatable: true,
  name: RawIndicatorFieldId.Name,
  searchable: true,
  type: 'string',
  category: 'threat',
  description: DESCRIPTION,
  esTypes: ['keyword'],
} as const;

export const useSourcererDataView = () => {
  const { sourcererDataView } = useSecurityContext();

  const updatedPattern = useMemo(() => {
    const fields = [...sourcererDataView.indexPattern.fields, indicatorNameField];

    return {
      ...sourcererDataView.indexPattern,
      fields,
    } as SecuritySolutionDataViewBase;
  }, [sourcererDataView.indexPattern]);

  const indexPatterns = useMemo(() => [updatedPattern], [updatedPattern]);

  const browserFields = useMemo(() => {
    const { threat = { fields: {} } } = sourcererDataView.browserFields;

    return {
      ...sourcererDataView.browserFields,
      threat: {
        fields: {
          ...threat.fields,
          [indicatorNameField.name]: indicatorNameField,
        },
      },
    };
  }, [sourcererDataView.browserFields]);

  return useMemo(
    () => ({
      ...sourcererDataView,
      indexPatterns,
      indexPattern: updatedPattern,
      browserFields,
    }),
    [browserFields, indexPatterns, sourcererDataView, updatedPattern]
  );
};
