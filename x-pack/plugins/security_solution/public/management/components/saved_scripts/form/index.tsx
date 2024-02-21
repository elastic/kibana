/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle, EuiText } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { QueryDescriptionField } from './query_description_field';
import { TimeoutField } from './timeout_field';
import { QueryIdField } from './query_id_field';
import { PlatformCheckBoxGroupField } from './platform_checkbox_group_field';
import { CodeEditorField } from './code_editor_field';

interface SavedQueryFormProps {
  viewMode?: boolean;
  // hasPlayground?: boolean;
  // isValid?: boolean;
  idSet?: Set<string>;
}

const SavedScriptsFormComponent: React.FC<SavedQueryFormProps> = ({ viewMode, idSet }) => {
  const euiFieldProps = useMemo(
    () => ({
      isDisabled: !!viewMode,
    }),
    [viewMode]
  );

  return (
    <>
      <QueryIdField idSet={idSet} euiFieldProps={euiFieldProps} />
      <EuiSpacer />
      <QueryDescriptionField euiFieldProps={euiFieldProps} />
      <EuiSpacer />
      <CodeEditorField euiFieldProps={euiFieldProps} />
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent={'spaceBetween'}>
        <EuiFlexItem>
          <TimeoutField euiFieldProps={euiFieldProps} />
        </EuiFlexItem>
        <EuiFlexItem />
      </EuiFlexGroup>
      <EuiSpacer size="xl" />

      <EuiSpacer size="xl" />
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem>
          <PlatformCheckBoxGroupField euiFieldProps={euiFieldProps} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

SavedScriptsFormComponent.displayName = 'SavedScriptsForm';

export const SavedScriptsForm = React.memo(SavedScriptsFormComponent);
