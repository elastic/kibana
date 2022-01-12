/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiButton,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
} from '@elastic/eui';
import * as i18n from '../../translations';

import { DEFAULT_INDEX_KEY } from '../../../../../../../common/constants';
import { useKibana } from '../../../../../../common/lib/kibana';

import {
  BulkAction,
  BulkActionEditType,
} from '../../../../../../../common/detection_engine/schemas/common/schemas';

import {
  Field,
  Form,
  getUseField,
  useForm,
  ERROR_CODE,
  FIELD_TYPES,
  fieldValidators,
  FormSchema,
  ValidationFunc,
} from '../../../../../../shared_imports';

import { IndexPatternsForm, schema as indexPatternsFormSchema } from './forms/index_patterns_form';
interface IndexPatternForm {
  index: string[];
}
interface TagsForm {
  tags: string[];
}

type BulkeEditForm = IndexPatternForm | TagsForm;

interface IndexEditActions {
  index: string[];
}

interface FormComponentProps<T> {
  data: T;
  onChange: (formState: FormState<T>) => void;
  editAction: BulkActionEditType;
}

const isIndexPatternsEditAction = (editAction: BulkActionEditType) =>
  [
    BulkActionEditType.add_index_patterns,
    BulkActionEditType.delete_index_patterns,
    BulkActionEditType.set_index_patterns,
  ].includes(editAction);

const isTagsEditAction = (editAction: BulkActionEditType) =>
  [
    BulkActionEditType.add_tags,
    BulkActionEditType.delete_tags,
    BulkActionEditType.set_tags,
  ].includes(editAction);

const computeFormSchema = (editAction: BulkActionEditType) => {
  if (isIndexPatternsEditAction(editAction)) {
    return indexPatternsFormSchema;
  }
};

export const FormComponent = <T,>({ data, onChange, editAction }: FormComponentProps<T>) => {
  const schema = computeFormSchema(editAction);
  const { form } = useForm<T>({
    defaultValue: data,
    schema,
  });

  const { isValid, validate, getFormData } = form;

  useEffect(() => {
    const updatedFormState = { isValid, getData: getFormData, validate };

    // Forward the state to the parent
    onChange(updatedFormState);
  }, [onChange, isValid, getFormData, validate]);

  return (
    <Form form={form}>
      {isIndexPatternsEditAction(editAction) ? (
        <IndexPatternsForm editAction={editAction} form={form} />
      ) : isTagsEditAction(editAction) ? (
        <h2>Tags form</h2>
      ) : null}
    </Form>
  );
};

interface FormState<T> {
  isValid: boolean | undefined;
  getData(): T;
  validate(): Promise<boolean>;
}

interface Props {
  onClose: () => void;
  onConfirm: (formState: IndexPatternForm) => void;
  editAction: BulkActionEditType;
}

const flyoutTitleMap: Record<BulkActionEditType, string> = {
  [BulkActionEditType.add_index_patterns]: 'Add index patterns',
  [BulkActionEditType.delete_index_patterns]: 'Delete index patterns',
  [BulkActionEditType.add_tags]: 'Add tags',
  [BulkActionEditType.delete_tags]: 'Delete tags',
};

const prepareConfirmData = (editAction: BulkActionEditType, formData: FormData) => {
  if (isIndexPatternsEditAction(editAction)) {
    const bulkActionEditType = formData.overwrite
      ? BulkActionEditType.set_index_patterns
      : editAction;
    return { value: formData.index, type: bulkActionEditType };
  }

  if (isTagsEditAction(editAction)) {
    const bulkActionEditType = formData.overwrite ? BulkActionEditType.set_tags : editAction;
    return { value: formData.tags, type: bulkActionEditType };
  }
};

const BulkEditFlyoutComponent = ({ onClose, onConfirm, editAction }: Props) => {
  const initialFormData = useMemo(() => {
    if (isIndexPatternsEditAction(editAction)) {
      return { index: [], overwrite: false };
    }
    if (isTagsEditAction(editAction)) {
      return { tags: [], overwrite: false };
    }
  }, [editAction]);

  const initialState = {
    isValid: undefined,
    getData: () => ({}),
    validate: async () => true,
  } as FormState<typeof initialFormData>;

  const [formState, setFormState] = useState<FormState<typeof initialFormData>>(initialState);

  const handleSave = async () => {
    const isValid = await formState.validate();
    if (isValid) {
      onConfirm(prepareConfirmData(editAction, formState.getData()));
    }
  };

  const sendForm = useCallback(
    async (updatedFormState: FormState<typeof initialFormData>) => {
      setFormState(updatedFormState);
    },
    [setFormState]
  );
  const { isValid } = formState;

  const flyoutTitleId = 'Bulk edit flyout';

  return (
    <EuiFlyout ownFocus onClose={onClose} aria-labelledby={flyoutTitleId} size="s">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>{flyoutTitleMap[editAction] ?? null}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <FormComponent onChange={sendForm} data={initialFormData} editAction={editAction} />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              Close
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={handleSave} fill disabled={isValid === false}>
              Save
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export const BulkEditFlyout = React.memo(BulkEditFlyoutComponent);

BulkEditFlyout.displayName = 'BulkEditFlyout';
