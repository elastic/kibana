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
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { useRouterNavigate } from '../../../common/lib/kibana';
import { Form } from '../../../shared_imports';
import { SavedQueryForm } from '../../../saved_queries/form';
import { useSavedQueryForm } from '../../../saved_queries/form/use_saved_query_form';
import type { SavedQuerySO } from '../list';

interface NewSavedQueryFormProps {
  defaultValue?: unknown;
  handleSubmit: () => Promise<SavedQuerySO>;
}

const NewSavedQueryFormComponent: React.FC<NewSavedQueryFormProps> = ({
  defaultValue,
  handleSubmit,
}) => {
  const savedQueryListProps = useRouterNavigate('saved_queries');

  const { form } = useSavedQueryForm({
    defaultValue,
    handleSubmit,
  });
  const { submit, isSubmitting, isValid } = form;

  return (
    <Form form={form}>
      <SavedQueryForm hasPlayground isValid={isValid} />
      <EuiBottomBar>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty color="ghost" {...savedQueryListProps}>
                  <FormattedMessage
                    id="xpack.osquery.addSavedQuery.form.cancelButtonLabel"
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
                    id="xpack.osquery.addSavedQuery.form.saveQueryButtonLabel"
                    defaultMessage="Save query"
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
    </Form>
  );
};

export const NewSavedQueryForm = React.memo(NewSavedQueryFormComponent);
