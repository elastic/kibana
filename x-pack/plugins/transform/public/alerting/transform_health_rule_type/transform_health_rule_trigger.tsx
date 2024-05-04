/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiForm, EuiSpacer } from '@elastic/eui';
import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import type { TransformHealthRuleParams } from '../../../common/types/alerting';
import { TestsSelectionControl } from './tests_selection_control';
import { TransformSelectorControl } from './transform_selector_control';
import { useGetTransforms } from '../../app/hooks';
import { useToastNotifications } from '../../app/app_dependencies';
import { ALL_TRANSFORMS_SELECTION } from '../../../common/constants';

export type TransformHealthRuleTriggerProps =
  RuleTypeParamsExpressionProps<TransformHealthRuleParams>;

const TransformHealthRuleTrigger: FC<TransformHealthRuleTriggerProps> = ({
  ruleParams,
  setRuleParams,
  errors,
}) => {
  const formErrors = Object.values(errors).flat();
  const isFormInvalid = formErrors.length > 0;

  const toast = useToastNotifications();
  const { error, data } = useGetTransforms();
  const transformOptions = useMemo(
    () => data?.transforms.filter((v) => v.config.sync).map((v) => v.id) ?? [],
    [data]
  );

  const onAlertParamChange = useCallback(
    <T extends keyof TransformHealthRuleParams>(param: T) =>
      (update: TransformHealthRuleParams[T]) => {
        setRuleParams(param, update);
      },
    [setRuleParams]
  );

  useEffect(() => {
    if (error !== null) {
      toast.addError(error, {
        title: i18n.translate(
          'xpack.transform.alertingRuleTypes.transformHealth.fetchErrorMessage',
          {
            defaultMessage: 'Unable to fetch transforms',
          }
        ),
      });
    }
  }, [error, toast]);

  const excludeTransformOptions = useMemo(() => {
    if (ruleParams.includeTransforms?.some((v) => v === ALL_TRANSFORMS_SELECTION)) {
      return transformOptions;
    }
    return null;
  }, [transformOptions, ruleParams.includeTransforms]);

  return (
    <EuiForm
      data-test-subj={'transformHealthAlertingRuleForm'}
      invalidCallout={'none'}
      error={formErrors as string[]}
      isInvalid={isFormInvalid}
    >
      <TransformSelectorControl
        label={
          <FormattedMessage
            id="xpack.transform.alertTypes.transformHealth.includeTransformsLabel"
            defaultMessage="Include transforms"
          />
        }
        options={transformOptions}
        selectedOptions={ruleParams.includeTransforms ?? []}
        onChange={onAlertParamChange('includeTransforms')}
        allowSelectAll
        errors={errors.includeTransforms as string[]}
      />

      <EuiSpacer size="m" />

      {!!excludeTransformOptions?.length || !!ruleParams.excludeTransforms?.length ? (
        <>
          <TransformSelectorControl
            label={
              <FormattedMessage
                id="xpack.transform.alertTypes.transformHealth.excludeTransformsLabel"
                defaultMessage="Exclude transforms"
              />
            }
            options={excludeTransformOptions ?? []}
            selectedOptions={ruleParams.excludeTransforms ?? []}
            onChange={onAlertParamChange('excludeTransforms')}
          />
          <EuiSpacer size="m" />
        </>
      ) : null}

      <TestsSelectionControl
        config={ruleParams.testsConfig}
        onChange={onAlertParamChange('testsConfig')}
        errors={Array.isArray(errors.testsConfig) ? errors.testsConfig : []}
      />
    </EuiForm>
  );
};

// Default export is required for React.lazy loading

// eslint-disable-next-line import/no-default-export
export default TransformHealthRuleTrigger;
