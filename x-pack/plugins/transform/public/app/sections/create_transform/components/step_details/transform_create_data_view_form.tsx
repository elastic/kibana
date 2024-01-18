/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, type FC } from 'react';
import { useDispatch } from 'react-redux';

import { i18n } from '@kbn/i18n';
import { CreateDataViewForm } from '@kbn/ml-data-view-utils/components/create_data_view_form_row';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { getErrorMessage } from '../../../../../../common/utils/errors';

import { useGetDataViewTitles, useGetTransformsPreview } from '../../../../hooks';
import { useAppDependencies, useToastNotifications } from '../../../../app_dependencies';
import { ToastNotificationText } from '../../../../components';

import { useWizardSelector } from '../../state_management/create_transform_store';
import { selectPreviewRequest } from '../../state_management/step_define_selectors';

import { useDataView } from '../wizard/wizard';
import { setFormField, setFormSection } from '../../state_management/step_details_slice';

export const TransformCreateDataViewForm: FC = () => {
  const dispatch = useDispatch();
  const dataView = useDataView();

  const { application, i18n: i18nStart, theme } = useAppDependencies();
  const { capabilities } = application;
  const toastNotifications = useToastNotifications();

  const createDataView = useWizardSelector(
    (s) => s.stepDetailsForm.formSections.createDataView.enabled
  );
  const dataViewTimeField = useWizardSelector(
    (s) => s.stepDetailsForm.formFields.dataViewTimeField.value
  );
  const destinationIndex = useWizardSelector(
    (s) => s.stepDetailsForm.formFields.destinationIndex.value
  );

  const previewRequest = useWizardSelector((state) => selectPreviewRequest(state, dataView));

  const { error: transformsPreviewError, data: transformPreview } = useGetTransformsPreview(
    previewRequest,
    previewRequest !== undefined
  );

  const destIndexAvailableTimeFields = useMemo<string[]>(() => {
    if (!transformPreview) return [];
    const properties = transformPreview.generated_dest_index.mappings.properties;
    const timeFields: string[] = Object.keys(properties).filter(
      (col) => properties[col].type === 'date'
    );
    return timeFields;
  }, [transformPreview]);

  useEffect(
    function resetDataViewTimeField() {
      dispatch(
        setFormField({
          field: 'dataViewTimeField',
          value: destIndexAvailableTimeFields[0],
        })
      );
    },
    [dispatch, destIndexAvailableTimeFields]
  );

  useEffect(() => {
    if (transformsPreviewError !== null) {
      toastNotifications.addDanger({
        title: i18n.translate('xpack.transform.stepDetailsForm.errorGettingTransformPreview', {
          defaultMessage: 'An error occurred fetching the transform preview',
        }),
        text: toMountPoint(
          <ToastNotificationText text={getErrorMessage(transformsPreviewError)} />,
          { theme, i18n: i18nStart }
        ),
      });
    }
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transformsPreviewError]);

  const onTimeFieldChanged = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      // If the value is an empty string, it's not a valid selection
      if (value === '') {
        return;
      }
      // Find the time field based on the selected value
      // this is to account for undefined when user chooses not to use a date field
      const timeField = destIndexAvailableTimeFields.find((col) => col === value);

      dispatch(
        setFormField({
          field: 'dataViewTimeField',
          value: timeField ?? '',
        })
      );
    },
    [dispatch, destIndexAvailableTimeFields]
  );

  const canCreateDataView = useMemo(
    () =>
      capabilities.savedObjectsManagement?.edit === true ||
      capabilities.indexPatterns?.save === true,
    [capabilities]
  );

  const setCreateDataView = useCallback(
    (enabled: boolean) => {
      dispatch(setFormSection({ section: 'createDataView', enabled }));
    },
    [dispatch]
  );

  useEffect(() => {
    if (!canCreateDataView) {
      setCreateDataView(false);
    }
  });

  const { error: dataViewTitlesError, data: dataViewTitles } = useGetDataViewTitles();

  useEffect(() => {
    if (dataViewTitlesError !== null) {
      toastNotifications.addDanger({
        title: i18n.translate('xpack.transform.stepDetailsForm.errorGettingDataViewTitles', {
          defaultMessage: 'An error occurred getting the existing data view titles:',
        }),
        text: toMountPoint(<ToastNotificationText text={getErrorMessage(dataViewTitlesError)} />, {
          theme,
          i18n: i18nStart,
        }),
      });
    }
    // custom comparison
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [dataViewTitlesError]);

  const dataViewTitleExists = dataViewTitles?.some((name) => destinationIndex === name) ?? false;

  return (
    <CreateDataViewForm
      canCreateDataView={canCreateDataView}
      createDataView={createDataView}
      dataViewTitleExists={dataViewTitleExists}
      setCreateDataView={setCreateDataView}
      dataViewAvailableTimeFields={destIndexAvailableTimeFields}
      dataViewTimeField={dataViewTimeField}
      onTimeFieldChanged={onTimeFieldChanged}
    />
  );
};
