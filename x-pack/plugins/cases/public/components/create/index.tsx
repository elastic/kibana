/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPageSection } from '@elastic/eui';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { getUseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { CasesDeepLinkId } from '../../common/navigation';
import { HeaderPage } from '../header_page';
import { useCasesBreadcrumbs } from '../use_breadcrumbs';
import type { CreateCaseFormProps } from './form';
import { CreateCaseForm } from './form';
import * as i18n from './translations';

export const CommonUseField = getUseField({ component: Field });

export const CreateCase = React.memo<CreateCaseFormProps>(
  ({ afterCaseCreated, onCancel, onSuccess, timelineIntegration, withSteps }) => {
    useCasesBreadcrumbs(CasesDeepLinkId.casesCreate);

    return (
      <EuiPageSection restrictWidth={true}>
        <HeaderPage
          showBackButton={true}
          data-test-subj="case-create-title"
          title={i18n.CREATE_CASE_TITLE}
        />
        <CreateCaseForm
          afterCaseCreated={afterCaseCreated}
          onCancel={onCancel}
          onSuccess={onSuccess}
          timelineIntegration={timelineIntegration}
          withSteps={withSteps}
        />
      </EuiPageSection>
    );
  }
);

CreateCase.displayName = 'CreateCase';
