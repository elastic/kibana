/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useEffect } from 'react';
import { isEqual } from 'lodash';
import { useDispatch } from 'react-redux';

import { EuiSteps } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { getCombinedRuntimeMappings } from '@kbn/ml-runtime-field-utils';

import { getErrorMessage } from '../../../../../../common/utils/errors';

import { useGetTransforms } from '../../../../hooks';
import { matchAllQuery } from '../../../../common';
import { useAppDependencies, useToastNotifications } from '../../../../app_dependencies';
import { ToastNotificationText } from '../../../../components';

import { useWizardActions } from '../../state_management/create_transform_store';

import {
  applyTransformConfigToDefineState,
  getDefaultStepDefineState,
  euiStepDefine,
} from '../step_define';
import { euiStepCreate } from '../step_create';
import {
  applyTransformConfigToDetailsState,
  getDefaultStepDetailsState,
  getStepDetailsFormFields,
  getStepDetailsFormSections,
  euiStepDetails,
} from '../step_details';
import { stepDetailsFormSlice } from '../../state_management/step_details_slice';

import { useWizardContext } from './wizard';

export const useInitializeTransformWizardState = () => {
  const dispatch = useDispatch();
  const { searchItems, config } = useWizardContext();
  const { dataView } = searchItems;
  const { i18n: i18nStart, theme } = useAppDependencies();
  const toastNotifications = useToastNotifications();

  const {
    setAdvancedSourceEditorEnabled,
    setRuntimeMappings,
    setSourceConfigUpdated,
    setStepDefineState,
    setStepDetailsState,
  } = useWizardActions();

  const {
    error: transformsError,
    data: { transformIds },
    isLoading,
  } = useGetTransforms();

  useEffect(() => {
    if (transformsError !== null) {
      toastNotifications.addDanger({
        title: i18n.translate('xpack.transform.stepDetailsForm.errorGettingTransformList', {
          defaultMessage: 'An error occurred getting the existing transform IDs:',
        }),
        text: toMountPoint(<ToastNotificationText text={getErrorMessage(transformsError)} />, {
          theme,
          i18n: i18nStart,
        }),
      });
    }
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transformsError]);

  useEffect(() => {
    if (isLoading) return;

    const initialStepDefineState = applyTransformConfigToDefineState(
      getDefaultStepDefineState(searchItems),
      config,
      dataView
    );

    setRuntimeMappings(
      // apply runtime fields from both the index pattern and inline configurations
      getCombinedRuntimeMappings(dataView, config?.source?.runtime_mappings)
    );

    const query = config?.source?.query;
    if (query !== undefined && !isEqual(query, matchAllQuery)) {
      setAdvancedSourceEditorEnabled(true);
      setSourceConfigUpdated(true);
    }

    setStepDefineState(initialStepDefineState);

    setStepDetailsState(applyTransformConfigToDetailsState(getDefaultStepDetailsState(), config));

    dispatch(
      stepDetailsFormSlice.actions.initialize({
        formFieldsArr: getStepDetailsFormFields(config, transformIds),
        formSectionsArr: getStepDetailsFormSections(config),
      })
    );

    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);
};

export const WizardSteps: FC = () => {
  useInitializeTransformWizardState();

  return (
    <EuiSteps className="transform__steps" steps={[euiStepDefine, euiStepDetails, euiStepCreate]} />
  );
};
