/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { pick } from 'lodash';
import React from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useFetchInvestigation } from '../../hooks/use_fetch_investigation';
import { useUpdateInvestigation } from '../../hooks/use_update_investigation';
import { InvestigationNotFound } from '../investigation_not_found/investigation_not_found';
import { StatusField } from './fields/status_field';

export interface InvestigationForm {
  title: string;
  status: 'ongoing' | 'closed';
}

interface Props {
  investigationId: string;
  onClose: () => void;
}

export function InvestigationEditForm({ investigationId, onClose }: Props) {
  const {
    data: investigation,
    isLoading,
    isError,
    refetch,
  } = useFetchInvestigation({ id: investigationId });

  const { mutateAsync: updateInvestigation } = useUpdateInvestigation();

  const methods = useForm<InvestigationForm>({
    defaultValues: { title: 'new investigation', status: 'ongoing' },
    values: investigation ? pick(investigation, ['title', 'status']) : undefined,
    mode: 'all',
  });

  if (isError) {
    return <InvestigationNotFound />;
  }

  if (isLoading || !investigation) {
    return <EuiLoadingSpinner size="xl" />;
  }

  const onSubmit = async (data: InvestigationForm) => {
    await updateInvestigation({
      investigationId,
      payload: { title: data.title, status: data.status },
    });
    refetch();
    onClose();
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <EuiFlyout ownFocus onClose={() => onClose()} size="s">
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>
                {i18n.translate('xpack.investigateApp.investigationDetailsPage.h2.editLabel', {
                  defaultMessage: 'Edit',
                })}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiFlexGroup direction="column" gutterSize="l">
              <EuiFlexItem grow>
                <EuiFormRow
                  fullWidth
                  label={i18n.translate(
                    'xpack.investigateApp.investigationEditForm.span.titleLabel',
                    { defaultMessage: 'Title' }
                  )}
                  isInvalid={methods.getFieldState('title').invalid}
                >
                  <Controller
                    name="title"
                    control={methods.control}
                    rules={{ required: true }}
                    render={({ field: { ref, ...field }, fieldState }) => (
                      <EuiFieldText
                        {...field}
                        fullWidth
                        data-test-subj="titleInput"
                        required
                        isInvalid={fieldState.invalid}
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    )}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow>
                <StatusField />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="closeBtn"
                  iconType="cross"
                  onClick={() => onClose()}
                  flush="left"
                >
                  {i18n.translate(
                    'xpack.investigateApp.investigationDetailsPage.closeButtonEmptyLabel',
                    { defaultMessage: 'Close' }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton data-test-subj="saveBtn" onClick={methods.handleSubmit(onSubmit)} fill>
                  {i18n.translate('xpack.investigateApp.investigationDetailsPage.saveButtonLabel', {
                    defaultMessage: 'Save',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      </form>
    </FormProvider>
  );
}
