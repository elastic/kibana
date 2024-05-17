import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ALL_SPACES_ID } from '@kbn/security-plugin/public';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { SyntheticsParams } from '../../../../../../common/runtime_types';
import { useFormWrapped } from '../../../../../hooks/use_form_wrapped';
import { ClientPluginsStart } from '../../../../../plugin';
import {
  addNewGlobalParamAction,
  editGlobalParamAction,
  getGlobalParamAction,
  selectGlobalParamState,
} from '../../../state/global_params';
import { syncGlobalParamsAction } from '../../../state/settings';
import { NoPermissionsTooltip } from '../../common/components/permissions';
import { AddParamForm } from './add_param_form';
import { ListParamItem } from './params_list';

export const AddParamFlyout = ({
  items,
  isEditingItem,
  setIsEditingItem,
}: {
  items: ListParamItem[];
  isEditingItem: ListParamItem | null;
  setIsEditingItem: React.Dispatch<React.SetStateAction<ListParamItem | null>>;
}) => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  const { id, ...dataToSave } = isEditingItem ?? {};

  const form = useFormWrapped<SyntheticsParams>({
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

  const { application } = useKibana<ClientPluginsStart>().services;

  const canSave = (application?.capabilities.uptime.save ?? false) as boolean;

  const dispatch = useDispatch();

  const { isSaving, savedData } = useSelector(selectGlobalParamState);

  const onSubmit = (formData: SyntheticsParams) => {
    const { namespaces, ...paramRequest } = formData;
    const shareAcrossSpaces = namespaces?.includes(ALL_SPACES_ID);

    if (isEditingItem && id) {
      dispatch(
        editGlobalParamAction.get({
          id,
          paramRequest: { ...paramRequest, share_across_spaces: shareAcrossSpaces },
        })
      );
    } else {
      dispatch(
        addNewGlobalParamAction.get({
          ...paramRequest,
          share_across_spaces: shareAcrossSpaces,
        })
      );
    }
  };

  useEffect(() => {
    if (savedData && !isSaving) {
      closeFlyout();
      dispatch(getGlobalParamAction.get());
      dispatch(syncGlobalParamsAction.get());
    }
  }, [savedData, isSaving, closeFlyout, dispatch]);

  useEffect(() => {
    if (isEditingItem) {
      const { id: _id, ...dataToEdit } = isEditingItem;
      setIsFlyoutVisible(true);
      form.reset(dataToEdit);
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
                <EuiButtonEmpty
                  data-test-subj="syntheticsAddParamFlyoutButton"
                  iconType="cross"
                  onClick={closeFlyout}
                  flush="left"
                >
                  {CLOSE_TABLE}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="syntheticsAddParamFlyoutButton"
                  onClick={handleSubmit(onSubmit)}
                  fill
                  isLoading={isSaving}
                >
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
      <NoPermissionsTooltip canEditSynthetics={canSave}>
        <EuiButton
          data-test-subj="syntheticsAddParamFlyoutButton"
          fill
          iconType="plusInCircleFilled"
          iconSide="left"
          onClick={() => setIsFlyoutVisible(true)}
          isDisabled={!canSave}
        >
          {CREATE_PARAM}
        </EuiButton>
      </NoPermissionsTooltip>
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
