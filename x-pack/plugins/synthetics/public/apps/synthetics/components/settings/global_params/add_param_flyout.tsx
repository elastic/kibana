/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiButton,
  EuiTitle,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';
import { FormProvider } from 'react-hook-form';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetcher } from '@kbn/observability-plugin/public';
import { i18n } from '@kbn/i18n';
import { useDispatch } from 'react-redux';
import { apiService } from '../../../../../utils/api_service';
import { ClientPluginsStart } from '../../../../../plugin';
import { ListParamItem } from './params_list';
import { SyntheticsParam } from '../../../../../../common/runtime_types';
import { useFormWrapped } from '../../../../../hooks/use_form_wrapped';
import { AddParamForm } from './add_param_form';
import { SYNTHETICS_API_URLS } from '../../../../../../common/constants';
import { syncGlobalParamsAction } from '../../../state/settings';

export const AddParamFlyout = ({
  items,
  isEditingItem,
  setIsEditingItem,
  setRefreshList,
}: {
  items: ListParamItem[];
  setRefreshList: React.Dispatch<React.SetStateAction<number>>;
  isEditingItem: ListParamItem | null;
  setIsEditingItem: React.Dispatch<React.SetStateAction<ListParamItem | null>>;
}) => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  const { id, ...dataToSave } = isEditingItem ?? {};

  const form = useFormWrapped<SyntheticsParam>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: dataToSave ?? {
      key: '',
      tags: [],
      description: '',
      value: '',
    },
  });

  const closeFlyout = useCallback(() => {
    setIsFlyoutVisible(false);
    setIsEditingItem(null);
    form.reset({ key: '', tags: [], description: '', value: '' });
    // no need to add form value, it keeps changing on reset
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setIsEditingItem]);

  const [paramData, setParamData] = useState<SyntheticsParam | null>(null);

  const { application } = useKibana<ClientPluginsStart>().services;

  const { loading, data } = useFetcher(async () => {
    if (!paramData) {
      return;
    }
    if (isEditingItem) {
      return apiService.put(SYNTHETICS_API_URLS.PARAMS, { id, ...paramData });
    }
    return apiService.post(SYNTHETICS_API_URLS.PARAMS, paramData);
  }, [paramData]);

  const canSave = (application?.capabilities.uptime.save ?? false) as boolean;

  const onSubmit = (formData: SyntheticsParam) => {
    setParamData(formData);
  };

  const dispatch = useDispatch();

  useEffect(() => {
    if (data && !loading) {
      closeFlyout();
      setRefreshList(Date.now());
      setParamData(null);
      dispatch(syncGlobalParamsAction.get());
    }
  }, [data, loading, closeFlyout, setRefreshList, dispatch]);

  useEffect(() => {
    if (isEditingItem) {
      setIsFlyoutVisible(true);
      form.reset(isEditingItem);
    }
    // no need to add form value, it keeps changing on reset
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditingItem]);

  const { handleSubmit } = form;

  let flyout;

  if (isFlyoutVisible) {
    flyout = (
      <FormProvider {...form}>
        <EuiFlyout ownFocus onClose={closeFlyout} size="m" style={{ minWidth: 500 }}>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>{isEditingItem ? EDIT_PARAM : CREATE_PARAM}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiSpacer size="m" />
            <AddParamForm items={items} isEditingItem={isEditingItem} />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
                  {CLOSE_TABLE}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={handleSubmit(onSubmit)} fill isLoading={loading}>
                  {SAVE_TABLE}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      </FormProvider>
    );
  }

  return (
    <div>
      <EuiButton
        fill
        iconType="plusInCircleFilled"
        iconSide="left"
        onClick={() => setIsFlyoutVisible(true)}
        isDisabled={!canSave}
      >
        {CREATE_PARAM}
      </EuiButton>
      {flyout}
    </div>
  );
};

const CLOSE_TABLE = i18n.translate('xpack.synthetics.settingsRoute.cancel', {
  defaultMessage: 'Close',
});

const CREATE_PARAM = i18n.translate('xpack.synthetics.settingsRoute.createParam', {
  defaultMessage: 'Create Parameter',
});

const EDIT_PARAM = i18n.translate('xpack.synthetics.settingsRoute.params.editLabel', {
  defaultMessage: 'Edit Parameter',
});

const SAVE_TABLE = i18n.translate('xpack.synthetics.settingsRoute.save', {
  defaultMessage: 'Save',
});
