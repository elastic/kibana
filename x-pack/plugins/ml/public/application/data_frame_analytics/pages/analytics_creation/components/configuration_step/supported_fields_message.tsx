/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useState, useEffect } from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
// import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { AnalyticsJobType } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { useMlContext } from '../../../../../contexts/ml';
import { ANALYSIS_CONFIG_TYPE } from '../../../../common/analytics';
import { OMIT_FIELDS } from '../../../analytics_management/components/create_analytics_form/form_options_validation';
import { IndexPattern } from '../../../../../../../../../../src/plugins/data/public';

interface Props {
  jobType: AnalyticsJobType;
}

export const SupportedFieldsMessage: FC<Props> = ({ jobType }) => {
  const [sourceIndexContainsNumericalFields, setSourceIndexContainsNumericalFields] = useState<
    boolean
  >(true);
  const [sourceIndexFieldsCheckFailed, setSourceIndexFieldsCheckFailed] = useState<boolean>(false);

  const mlContext = useMlContext();
  const { currentIndexPattern } = mlContext;

  // Find out if index pattern contain numeric fields. Provides a hint in the form
  // that an analytics jobs is not able to identify outliers if there are no numeric fields present.
  const validateSourceIndexFields = async () => {
    if (currentIndexPattern && currentIndexPattern.id) {
      try {
        const index: IndexPattern = await mlContext.indexPatterns.get(currentIndexPattern.id);
        const containsNumericalFields: boolean = index.fields.some(
          ({ name, type }) => !OMIT_FIELDS.includes(name) && type === 'number'
        );

        setSourceIndexContainsNumericalFields(containsNumericalFields);
        setSourceIndexFieldsCheckFailed(false);
      } catch (e) {
        setSourceIndexFieldsCheckFailed(true);
      }
    }
  };

  useEffect(() => {
    if (jobType !== undefined) {
      setSourceIndexContainsNumericalFields(true);
      setSourceIndexFieldsCheckFailed(false);

      if (jobType === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION) {
        validateSourceIndexFields();
      }
    }
  }, [jobType]);

  if (sourceIndexContainsNumericalFields) return null;

  if (sourceIndexFieldsCheckFailed === true) {
    return (
      <Fragment>
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.create.sourceIndexFieldCheckError"
          defaultMessage="There was a problem checking for numerical fields. Please refresh the page and try again."
        />
        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  return (
    <Fragment>
      <EuiText size="xs" color="danger">
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.create.sourceObjectHelpText"
          defaultMessage="This index pattern does not contain any numeric type fields. The analytics job may not be able to come up with any outliers."
        />
      </EuiText>
      <EuiSpacer size="s" />
    </Fragment>
  );
};
