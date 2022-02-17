/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Field, getUseField } from '../../common/shared_imports';
import * as i18n from './translations';
import { CreateCaseForm, CreateCaseFormProps } from './form';
import { HeaderPage } from '../header_page';
import { useCasesBreadcrumbs } from '../use_breadcrumbs';
import { CasesDeepLinkId } from '../../common/navigation';

export const CommonUseField = getUseField({ component: Field });

export const CreateCase = React.memo<CreateCaseFormProps>(
  ({ afterCaseCreated, onCancel, onSuccess, timelineIntegration, withSteps }) => {
    useCasesBreadcrumbs(CasesDeepLinkId.casesCreate);

    return (
      <>
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
      </>
    );
  }
);

CreateCase.displayName = 'CreateCase';
