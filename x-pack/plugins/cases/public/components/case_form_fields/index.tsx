/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { Title } from './title';
import { Tags } from './tags';
import { Category } from './category';
import { Severity } from './severity';
import { Description } from './description';
import { useCasesFeatures } from '../../common/use_cases_features';
import { Assignees } from './assignees';
import { CustomFields } from './custom_fields';
import type { CasesConfigurationUI } from '../../containers/types';

interface Props {
  isLoading: boolean;
  configurationCustomFields: CasesConfigurationUI['customFields'];
  setCustomFieldsOptional?: boolean;
  isEditMode?: boolean;
  draftStorageKey?: string;
}

const CaseFormFieldsComponent: React.FC<Props> = ({
  isLoading,
  configurationCustomFields,
  setCustomFieldsOptional = false,
  isEditMode,
  draftStorageKey,
}) => {
  const { caseAssignmentAuthorized } = useCasesFeatures();

  return (
    <EuiFlexGroup data-test-subj="case-form-fields" direction="column" gutterSize="none">
      <Title isLoading={isLoading} />
      {caseAssignmentAuthorized ? <Assignees isLoading={isLoading} /> : null}
      <Tags isLoading={isLoading} />
      <Category isLoading={isLoading} />
      <Severity isLoading={isLoading} />
      <Description isLoading={isLoading} draftStorageKey={draftStorageKey} />
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
