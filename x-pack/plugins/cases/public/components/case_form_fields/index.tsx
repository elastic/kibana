/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { Title } from '../create/title';
import { Tags } from '../create/tags';
import { Category } from '../create/category';
import { Severity } from '../create/severity';
import { Description } from '../create/description';
import { useCasesFeatures } from '../../common/use_cases_features';
import { Assignees } from '../create/assignees';
import { CustomFields } from './custom_fields';
import type { CasesConfigurationUI } from '../../containers/types';

interface Props {
  isLoading: boolean;
  configurationCustomFields: CasesConfigurationUI['customFields'];
  setCustomFieldsOptional?: boolean;
  isEditMode?: boolean;
}

const CaseFormFieldsComponent: React.FC<Props> = ({
  isLoading,
  configurationCustomFields,
  setCustomFieldsOptional = false,
  isEditMode,
}) => {
  const { caseAssignmentAuthorized } = useCasesFeatures();

  return (
    <EuiFlexGroup data-test-subj="case-form-fields" direction="column">
      <Title isLoading={isLoading} />

      {caseAssignmentAuthorized ? <Assignees isLoading={isLoading} /> : null}

      <Tags isLoading={isLoading} />

      <Category isLoading={isLoading} />

      <Severity isLoading={isLoading} />

      <Description isLoading={isLoading} />

      <CustomFields
        isLoading={isLoading}
        setCustomFieldsOptional={setCustomFieldsOptional}
        configurationCustomFields={configurationCustomFields}
        isEditMode={isEditMode}
      />
    </EuiFlexGroup>
  );
};

CaseFormFieldsComponent.displayName = 'CaseFormFields';

export const CaseFormFields = memo(CaseFormFieldsComponent);
