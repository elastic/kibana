/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext, useEffect, useState } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import { getToastNotificationService } from '../../../../../../../services/toast_notification_service';

import { JobCreatorContext } from '../../../job_creator_context';
import { CategorizationJobCreator } from '../../../../../common/job_creator';
import { CategorizationField } from '../categorization_field';
import { CategorizationDetector } from '../categorization_detector';
import { CategorizationPerPartitionField } from '../categorization_partition_field';

import { FieldExamples } from './field_examples';
import { ExamplesValidCallout } from './examples_valid_callout';
import { InvalidCssVersionCallout } from './invalid_ccs_version_valid_callout';
import {
  CategoryFieldExample,
  FieldExampleCheck,
} from '../../../../../../../../../common/types/categories';
import { CATEGORY_EXAMPLES_VALIDATION_STATUS } from '../../../../../../../../../common/constants/categorization_job';
import { LoadingWrapper } from '../../../charts/loading_wrapper';

interface Props {
  setIsValid: (na: boolean) => void;
}

export const CategorizationDetectors: FC<Props> = ({ setIsValid }) => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as CategorizationJobCreator;

  const [loadingData, setLoadingData] = useState(false);
  const [ccsVersionFailure, setCcsVersionFailure] = useState(false);
  const [start, setStart] = useState(jobCreator.start);
  const [end, setEnd] = useState(jobCreator.end);
  const [categorizationAnalyzerString, setCategorizationAnalyzerString] = useState(
    JSON.stringify(jobCreator.categorizationAnalyzer)
  );
  const [fieldExamples, setFieldExamples] = useState<CategoryFieldExample[] | null>(null);
  const [overallValidStatus, setOverallValidStatus] = useState(
    CATEGORY_EXAMPLES_VALIDATION_STATUS.INVALID
  );
  const [validationChecks, setValidationChecks] = useState<FieldExampleCheck[]>([]);

  const [categorizationFieldName, setCategorizationFieldName] = useState(
    jobCreator.categorizationFieldName
  );

  useEffect(() => {
    if (jobCreator.categorizationFieldName !== categorizationFieldName) {
      jobCreator.categorizationFieldName = categorizationFieldName;
      jobCreatorUpdate();
    }
    loadFieldExamples();
  }, [categorizationFieldName]);

  useEffect(() => {
    let updateExamples = false;
    if (jobCreator.start !== start || jobCreator.end !== end) {
      setStart(jobCreator.start);
      setEnd(jobCreator.end);
      updateExamples = true;
    }
    const tempCategorizationAnalyzerString = JSON.stringify(jobCreator.categorizationAnalyzer);
    if (tempCategorizationAnalyzerString !== categorizationAnalyzerString) {
      setCategorizationAnalyzerString(tempCategorizationAnalyzerString);
      updateExamples = true;
    }

    if (updateExamples) {
      loadFieldExamples();
    }
    if (jobCreator.categorizationFieldName !== categorizationFieldName) {
      setCategorizationFieldName(jobCreator.categorizationFieldName);
    }
  }, [jobCreatorUpdated]);

  async function loadFieldExamples() {
    if (categorizationFieldName !== null) {
      setLoadingData(true);
      try {
        const {
          examples,
          overallValidStatus: tempOverallValidStatus,
          validationChecks: tempValidationChecks,
          ccsVersionFailure: tempCcsVersionFailure,
        } = await jobCreator.loadCategorizationFieldExamples();
        setFieldExamples(examples);
        setOverallValidStatus(tempOverallValidStatus);
        setValidationChecks(tempValidationChecks);
        setCcsVersionFailure(tempCcsVersionFailure);
        setLoadingData(false);
      } catch (error) {
        setLoadingData(false);
        setFieldExamples(null);
        setValidationChecks([]);
        setOverallValidStatus(CATEGORY_EXAMPLES_VALIDATION_STATUS.INVALID);
        getToastNotificationService().displayErrorToast(error);
        setCcsVersionFailure(false);
      }
    } else {
      setFieldExamples(null);
      setValidationChecks([]);
      setOverallValidStatus(CATEGORY_EXAMPLES_VALIDATION_STATUS.INVALID);
      setCcsVersionFailure(false);
    }
    setIsValid(categorizationFieldName !== null);
  }

  useEffect(() => {
    jobCreatorUpdate();
  }, [overallValidStatus]);

  return (
    <>
      <CategorizationDetector />
      <EuiHorizontalRule />
      <CategorizationField />
      {loadingData === true && (
        <LoadingWrapper hasData={false} loading={true}>
          <div />
        </LoadingWrapper>
      )}
      {ccsVersionFailure === false && fieldExamples !== null && loadingData === false && (
        <>
          <ExamplesValidCallout
            overallValidStatus={overallValidStatus}
            validationChecks={validationChecks}
            categorizationAnalyzer={jobCreator.categorizationAnalyzer}
          />
          <FieldExamples fieldExamples={fieldExamples} />
        </>
      )}
      {ccsVersionFailure === true && <InvalidCssVersionCallout />}
      <EuiHorizontalRule />
      <CategorizationPerPartitionField />
    </>
  );
};
