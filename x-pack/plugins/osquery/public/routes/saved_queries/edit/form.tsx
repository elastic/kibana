/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBottomBar,
  EuiButtonEmpty,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import React, { useRef } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { useRouterNavigate } from '../../../common/lib/kibana';
import { Form } from '../../../shared_imports';
import { SavedQueryForm, SavedQueryFormRefObject } from '../../../saved_queries/form';
import { useSavedQueryForm } from '../../../saved_queries/form/use_saved_query_form';

interface EditSavedQueryFormProps {
  defaultValue?: unknown;
  handleSubmit: () => Promise<void>;
  viewMode?: boolean;
}

const EditSavedQueryFormComponent: React.FC<EditSavedQueryFormProps> = ({
  defaultValue,
  handleSubmit,
  viewMode,
}) => {
  const savedQueryFormRef = useRef<SavedQueryFormRefObject>(null);
  const savedQueryListProps = useRouterNavigate('saved_queries');

  const { form } = useSavedQueryForm({
    defaultValue,
    savedQueryFormRef,
    handleSubmit,
  });
  const { submit, isSubmitting } = form;

  return (
    <Form form={form}>
      <SavedQueryForm ref={savedQueryFormRef} viewMode={viewMode} hasPlayground />
      {!viewMode && (
        <>
          <EuiBottomBar>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="m">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty color="ghost" {...savedQueryListProps}>
                      <FormattedMessage
                        id="xpack.osquery.editSavedQuery.form.cancelButtonLabel"
                        defaultMessage="Cancel"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      isLoading={isSubmitting}
                      color="primary"
                      fill
                      size="m"
                      iconType="save"
                      onClick={submit}
                    >
                      <FormattedMessage
                        id="xpack.osquery.editSavedQuery.form.updateQueryButtonLabel"
                        defaultMessage="Update query"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiBottomBar>
          <EuiSpacer size="xxl" />
          <EuiSpacer size="xxl" />
          <EuiSpacer size="xxl" />
        </>
      )}
    </Form>
  );
};

export const EditSavedQueryForm = React.memo(EditSavedQueryFormComponent);
