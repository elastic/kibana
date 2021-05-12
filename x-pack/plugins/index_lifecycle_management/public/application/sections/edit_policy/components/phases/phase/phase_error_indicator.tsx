/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, memo } from 'react';
import { EuiIconTip } from '@elastic/eui';

import { Phases } from '../../../../../../../common/types';
import { useFormErrorsContext } from '../../../form';

interface Props {
  phase: string & keyof Phases;
}

const i18nTexts = {
  toolTipContent: i18n.translate('xpack.indexLifecycleMgmt.phaseErrorIcon.tooltipDescription', {
    defaultMessage: 'This phase contains errors.',
  }),
};

/**
 * This component hooks into the form state and updates whenever new form data is inputted.
 */
export const PhaseErrorIndicator: FunctionComponent<Props> = memo(({ phase }) => {
  const { errors } = useFormErrorsContext();

  if (Object.keys(errors[phase]).length) {
    return (
      <div data-test-subj={`phaseErrorIndicator-${phase}`}>
        <EuiIconTip type="alert" color="danger" content={i18nTexts.toolTipContent} />
      </div>
    );
  }

  return null;
});
