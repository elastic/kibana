/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useState, useEffect } from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { AnalyticsJobType } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { ANALYSIS_CONFIG_TYPE } from '../../../../common/analytics';
import { Field, EVENT_RATE_FIELD_ID } from '../../../../../../../common/types/fields';
import { OMIT_FIELDS } from '../../../../../../../common/constants/field_types';
import { BASIC_NUMERICAL_TYPES, EXTENDED_NUMERICAL_TYPES } from '../../../../common/fields';
import { CATEGORICAL_TYPES } from './form_options_validation';
import { ES_FIELD_TYPES } from '../../../../../../../../../../src/plugins/data/public';
import { newJobCapsService } from '../../../../../services/new_job_capabilities_service';

const containsClassificationFieldsCb = ({ name, type }: Field) =>
  !OMIT_FIELDS.includes(name) &&
  name !== EVENT_RATE_FIELD_ID &&
  (BASIC_NUMERICAL_TYPES.has(type) ||
    CATEGORICAL_TYPES.has(type) ||
    type === ES_FIELD_TYPES.BOOLEAN);

const containsRegressionFieldsCb = ({ name, type }: Field) =>
  !OMIT_FIELDS.includes(name) &&
  name !== EVENT_RATE_FIELD_ID &&
  (BASIC_NUMERICAL_TYPES.has(type) || EXTENDED_NUMERICAL_TYPES.has(type));

const containsOutlierFieldsCb = ({ name, type }: Field) =>
  !OMIT_FIELDS.includes(name) && name !== EVENT_RATE_FIELD_ID && BASIC_NUMERICAL_TYPES.has(type);

const callbacks: Record<ANALYSIS_CONFIG_TYPE, (f: Field) => boolean> = {
  [ANALYSIS_CONFIG_TYPE.CLASSIFICATION]: containsClassificationFieldsCb,
  [ANALYSIS_CONFIG_TYPE.REGRESSION]: containsRegressionFieldsCb,
  [ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION]: containsOutlierFieldsCb,
};

const messages: Record<ANALYSIS_CONFIG_TYPE, JSX.Element> = {
  [ANALYSIS_CONFIG_TYPE.CLASSIFICATION]: (
    <FormattedMessage
      id="xpack.ml.dataframe.analytics.create.sourceObjectClassificationHelpText"
      defaultMessage="This index pattern does not contain any supported fields. Classification jobs require categorical, numeric, or boolean fields."
    />
  ),
  [ANALYSIS_CONFIG_TYPE.REGRESSION]: (
    <FormattedMessage
      id="xpack.ml.dataframe.analytics.create.sourceObjectRegressionHelpText"
      defaultMessage="This index pattern does not contain any supported fields. Regression jobs require numeric fields."
    />
  ),
  [ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION]: (
    <FormattedMessage
      id="xpack.ml.dataframe.analytics.create.sourceObjectHelpText"
      defaultMessage="This index pattern does not contain any numeric type fields. The analytics job may not be able to come up with any outliers."
    />
  ),
};

interface Props {
  jobType: AnalyticsJobType;
}

export const SupportedFieldsMessage: FC<Props> = ({ jobType }) => {
  const [sourceIndexContainsSupportedFields, setSourceIndexContainsSupportedFields] = useState<
    boolean
  >(true);
  const [sourceIndexFieldsCheckFailed, setSourceIndexFieldsCheckFailed] = useState<boolean>(false);
  const { fields } = newJobCapsService;

  // Find out if index pattern contains supported fields for job type. Provides a hint in the form
  // that job may not run correctly if no supported fields are found.
  const validateFields = () => {
    if (fields && jobType !== undefined) {
      try {
        const containsSupportedFields: boolean = fields.some(callbacks[jobType]);

        setSourceIndexContainsSupportedFields(containsSupportedFields);
        setSourceIndexFieldsCheckFailed(false);
      } catch (e) {
        setSourceIndexFieldsCheckFailed(true);
      }
    }
  };

  useEffect(() => {
    if (jobType !== undefined) {
      setSourceIndexContainsSupportedFields(true);
      setSourceIndexFieldsCheckFailed(false);
      validateFields();
    }
  }, [jobType]);

  if (sourceIndexContainsSupportedFields === true) return null;

  if (sourceIndexFieldsCheckFailed === true) {
    return (
      <Fragment>
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.create.sourceIndexFieldsCheckError"
          defaultMessage="There was a problem checking for supported fields for job type. Please refresh the page and try again."
        />
        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  return (
    <Fragment>
      <EuiText size="xs" color="danger">
        {jobType !== undefined && messages[jobType]}
      </EuiText>
      <EuiSpacer size="s" />
    </Fragment>
  );
};
