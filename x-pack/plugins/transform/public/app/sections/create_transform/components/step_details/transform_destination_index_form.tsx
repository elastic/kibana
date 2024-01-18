/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, type FC } from 'react';
import { useDispatch } from 'react-redux';

import { i18n } from '@kbn/i18n';
import { DestinationIndexForm } from '@kbn/ml-creation-wizard-utils/components/destination_index_form';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { getErrorMessage } from '../../../../../../common/utils/errors';
import { isValidIndexName } from '../../../../../../common/utils/es_utils';

import { useDocumentationLinks, useGetEsIndices } from '../../../../hooks';
import { useAppDependencies, useToastNotifications } from '../../../../app_dependencies';
import { ToastNotificationText } from '../../../../components';

import { useWizardSelector } from '../../state_management/create_transform_store';
import { setFormField } from '../../state_management/step_details_slice';

export const TransformDestinationIndexForm: FC = () => {
  const dispatch = useDispatch();
  const { i18n: i18nStart, theme } = useAppDependencies();
  const toastNotifications = useToastNotifications();
  const { esIndicesCreateIndex } = useDocumentationLinks();

  const transformId = useWizardSelector((s) => s.stepDetailsForm.formFields.transformId.value);
  const transformIdValid = useWizardSelector(
    (s) => s.stepDetailsForm.formFields.transformId.errorMessages.length === 0
  );
  const destinationIndex = useWizardSelector(
    (s) => s.stepDetailsForm.formFields.destinationIndex.value
  );

  const { error: esIndicesError, data: esIndicesData } = useGetEsIndices();
  const indexNames = esIndicesData?.map((index) => index.name) ?? [];

  useEffect(() => {
    if (esIndicesError !== null) {
      toastNotifications.addDanger({
        title: i18n.translate('xpack.transform.stepDetailsForm.errorGettingIndexNames', {
          defaultMessage: 'An error occurred getting the existing index names:',
        }),
        text: toMountPoint(<ToastNotificationText text={getErrorMessage(esIndicesError)} />, {
          theme,
          i18n: i18nStart,
        }),
      });
    }
    // custom comparison
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [esIndicesError]);

  const transformIdExists = false;
  const transformIdEmpty = transformId === '';

  const indexNameExists = indexNames.some((name) => destinationIndex === name);

  const [destIndexSameAsId, setDestIndexSameAsId] = useState<boolean>(
    destinationIndex !== undefined && destinationIndex === transformId
  );

  const setDestinationIndex = useCallback(
    (value: string) => dispatch(setFormField({ field: 'destinationIndex', value })),
    [dispatch]
  );

  useEffect(() => {
    if (destIndexSameAsId === true && !transformIdEmpty && transformIdValid) {
      setDestinationIndex(transformId);
    }
  }, [destIndexSameAsId, transformId]);

  const indexNameEmpty = destinationIndex === '';
  const indexNameValid = isValidIndexName(destinationIndex);

  return (
    <DestinationIndexForm
      createIndexLink={esIndicesCreateIndex}
      destinationIndex={destinationIndex}
      destinationIndexNameEmpty={indexNameEmpty}
      destinationIndexNameExists={indexNameExists}
      destinationIndexNameValid={indexNameValid}
      destIndexSameAsId={destIndexSameAsId}
      fullWidth={false}
      indexNameExistsMessage={i18n.translate(
        'xpack.transform.stepDetailsForm.destinationIndexHelpText',
        {
          defaultMessage:
            'An index with this name already exists. Be aware that running this transform will modify this destination index.',
        }
      )}
      isJobCreated={transformIdExists}
      onDestinationIndexChange={setDestinationIndex}
      setDestIndexSameAsId={setDestIndexSameAsId}
      switchLabel={i18n.translate(
        'xpack.transform.stepDetailsForm.destinationIndexFormSwitchLabel',
        {
          defaultMessage: 'Use transform ID as destination index name',
        }
      )}
    />
  );
};
