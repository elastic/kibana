/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useFormContext } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiFlexGroup } from '@elastic/eui';
import { Title } from '../create/title';
import { Tags } from '../create/tags';
import { Category } from '../create/category';
import { Severity } from '../create/severity';
import { Description } from '../create/description';
import { useCasesFeatures } from '../../common/use_cases_features';
import { Assignees } from '../create/assignees';
import { CustomFields } from './custom_fields';
import { SyncAlertsToggle } from '../create/sync_alerts_toggle';
import type { CasesConfigurationUI } from '../../containers/types';

interface Props {
  configurationCustomFields: CasesConfigurationUI['customFields'];
  draftStorageKey: string;
}

const CaseFormFieldsComponent: React.FC<Props> = ({
  configurationCustomFields,
  draftStorageKey,
}) => {
  const { isSubmitting } = useFormContext();
  const { caseAssignmentAuthorized, isSyncAlertsEnabled } = useCasesFeatures();

  return (
    <EuiFlexGroup data-test-subj="case-form-fields" direction="column">
      <Title isLoading={isSubmitting} path="caseFields.title" />
      {caseAssignmentAuthorized ? (
        <Assignees isLoading={isSubmitting} path="caseFields.assignees" />
      ) : null}
      <Tags isLoading={isSubmitting} path="caseFields.tags" />

      <Category isLoading={isSubmitting} path="caseFields.category" />

      <Severity isLoading={isSubmitting} path="caseFields.severity" />

      <Description
        isLoading={isSubmitting}
        path="caseFields.description"
        draftStorageKey={draftStorageKey}
      />

      {isSyncAlertsEnabled ? (
        <SyncAlertsToggle isLoading={isSubmitting} path="caseFields.syncAlerts" />
      ) : null}

      <CustomFields
        isLoading={isSubmitting}
        path="caseFields.customFields"
        setAsOptional={true}
        configurationCustomFields={configurationCustomFields}
      />
    </EuiFlexGroup>
  );
};

CaseFormFieldsComponent.displayName = 'CaseFormFields';

export const CaseFormFields = memo(CaseFormFieldsComponent);
