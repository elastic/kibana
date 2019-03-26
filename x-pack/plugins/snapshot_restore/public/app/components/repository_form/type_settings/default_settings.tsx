/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: Remove once typescript definitions are in EUI
declare module '@elastic/eui' {
  // @ts-ignore
  export const EuiCodeEditor: React.SFC<any>;
}

import React from 'react';
import { Repository } from '../../../../../common/types';
import { useAppDependencies } from '../../../index';

import 'brace/theme/textmate';

import {
  EuiCodeEditor,
  // @ts-ignore
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiTitle,
} from '@elastic/eui';

interface Props {
  repository: Repository;
  onChange: (repository: Repository) => void;
}

export const DefaultSettings: React.FunctionComponent<Props> = ({ repository }) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();
  const { name, settings } = repository;

  return (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeDefault.configurationTitle"
              defaultMessage="Configuration"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryForm.typeDefault.configurationDescription"
          defaultMessage="JSON formatted configuration options."
        />
      }
      idAria="defaultRepositoryConfigurationDescription"
      fullWidth
    >
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeDefault.configurationLabel"
            defaultMessage="Configuration"
          />
        }
        fullWidth
      >
        <EuiCodeEditor
          mode="json"
          theme="textmate"
          width="100%"
          value={JSON.stringify(settings, null, 2)}
          setOptions={{
            showLineNumbers: false,
            tabSize: 2,
            maxLines: Infinity,
          }}
          editorProps={{
            $blockScrolling: Infinity,
          }}
          showGutter={false}
          minLines={6}
          aria-label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeDefault.configurationAriaLabel"
              defaultMessage="Configuration for repository '{name}'"
              values={{
                name,
              }}
            />
          }
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};
