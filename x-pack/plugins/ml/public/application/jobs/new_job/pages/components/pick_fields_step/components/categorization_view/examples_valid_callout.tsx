/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import {
  EuiCallOut,
  EuiSpacer,
  EuiCallOutProps,
  EuiAccordion,
  EuiListGroup,
  EuiListGroupItemProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  CategorizationAnalyzer,
  FieldExampleCheck,
} from '../../../../../../../../../common/types/categories';
import { EditCategorizationAnalyzerFlyout } from '../../../common/edit_categorization_analyzer_flyout';
import {
  CATEGORY_EXAMPLES_VALIDATION_STATUS,
  VALIDATION_CHECK_DESCRIPTION,
} from '../../../../../../../../../common/constants/categorization_job';
import { VALIDATION_RESULT } from '../../../../../../../../../common/types/categories';

interface Props {
  validationChecks: FieldExampleCheck[];
  overallValidStatus: CATEGORY_EXAMPLES_VALIDATION_STATUS;
  categorizationAnalyzer: CategorizationAnalyzer;
}

const allChecksButtonContent = i18n.translate(
  'xpack.ml.newJob.wizard.jobDetailsStep.allChecksButton',
  {
    defaultMessage: 'View all checks performed',
  }
);

export const ExamplesValidCallout: FC<Props> = ({
  overallValidStatus,
  validationChecks,
  categorizationAnalyzer,
}) => {
  const analyzerUsed = <AnalyzerUsed categorizationAnalyzer={categorizationAnalyzer} />;

  let color: EuiCallOutProps['color'] = 'success';
  let title = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.categorizationFieldCalloutTitle.valid',
    {
      defaultMessage: 'Selected category field is valid',
    }
  );

  if (overallValidStatus === CATEGORY_EXAMPLES_VALIDATION_STATUS.INVALID) {
    color = 'danger';
    title = i18n.translate(
      'xpack.ml.newJob.wizard.pickFieldsStep.categorizationFieldCalloutTitle.invalid',
      {
        defaultMessage: 'Selected category field is invalid',
      }
    );
  } else if (overallValidStatus === CATEGORY_EXAMPLES_VALIDATION_STATUS.PARTIALLY_VALID) {
    color = 'warning';
    title = i18n.translate(
      'xpack.ml.newJob.wizard.pickFieldsStep.categorizationFieldCalloutTitle.possiblyInvalid',
      {
        defaultMessage: 'Selected category field is possibly invalid',
      }
    );
  }

  return (
    <EuiCallOut
      color={color}
      title={title}
      data-test-subj={`mlJobWizardCategorizationExamplesCallout ${overallValidStatus}`}
    >
      {validationChecks.map((v, i) => (
        <div key={i}>{v.message}</div>
      ))}
      <EuiSpacer size="s" />
      {analyzerUsed}
      <EuiSpacer size="s" />
      <EuiAccordion id="all-checks" buttonContent={allChecksButtonContent}>
        <AllValidationChecks validationChecks={validationChecks} />
      </EuiAccordion>
    </EuiCallOut>
  );
};

const AnalyzerUsed: FC<{ categorizationAnalyzer: CategorizationAnalyzer }> = ({
  categorizationAnalyzer,
}) => {
  let analyzer = '';

  if (categorizationAnalyzer?.tokenizer !== undefined) {
    analyzer = categorizationAnalyzer.tokenizer;
  } else if (categorizationAnalyzer?.analyzer !== undefined) {
    analyzer = categorizationAnalyzer.analyzer;
  }

  return (
    <>
      <div>
        <FormattedMessage
          id="xpack.ml.newJob.wizard.pickFieldsStep.categorizationFieldAnalyzer"
          defaultMessage="Analyzer used: {analyzer}"
          values={{ analyzer }}
        />
      </div>
      <div>
        <EditCategorizationAnalyzerFlyout />
      </div>
    </>
  );
};

const AllValidationChecks: FC<{ validationChecks: FieldExampleCheck[] }> = ({
  validationChecks,
}) => {
  const list: EuiListGroupItemProps[] = Object.keys(VALIDATION_CHECK_DESCRIPTION).map((k, i) => {
    const failedCheck = validationChecks.find((vc) => vc.id === i);
    if (
      failedCheck !== undefined &&
      failedCheck?.valid !== CATEGORY_EXAMPLES_VALIDATION_STATUS.VALID
    ) {
      return {
        iconType: 'cross',
        label: failedCheck.message,
        size: 's',
      };
    }
    return {
      iconType: 'check',
      label: VALIDATION_CHECK_DESCRIPTION[i as VALIDATION_RESULT],
      size: 's',
    };
  });

  return <EuiListGroup listItems={list} maxWidth={false} />;
};
