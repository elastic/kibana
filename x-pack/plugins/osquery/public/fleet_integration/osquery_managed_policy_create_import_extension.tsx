/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, map } from 'lodash';
import { produce } from 'immer';
import { EuiFlexGroup, EuiFlexItem, EuiFilePicker, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useState } from 'react';

import { PackagePolicyCreateExtensionComponentProps } from '../../../fleet/public';
import { ScheduledQueryQueriesTable } from './components/scheduled_queries_table';

/**
 * Exports Osquery-specific package policy instructions
 * for use in the Fleet app create / edit package policy
 */
export const OsqueryManagedPolicyCreateImportExtension = React.memo<PackagePolicyCreateExtensionComponentProps>(
  ({ onChange, newPolicy }) => {
    const [files, setFiles] = useState({});

    let fileReader;

    const handleFileRead = (e) => {
      const content = fileReader.result;

      let queriesJSON;

      try {
        queriesJSON = JSON.parse(content);
      } catch (e) {}

      if (!queriesJSON?.queries) {
        return;
      }

      const updatedPolicy = produce(newPolicy, (draft) => {
        draft.inputs[0].streams = map(queriesJSON?.queries, (queryConfig, queryName) => ({
          data_stream: {
            type: 'logs',
            dataset: 'osquery_managed.result',
          },
          vars: {
            query: {
              type: 'text',
              value: queryConfig.query,
            },
            interval: {
              type: 'text',
              value: `${queryConfig.interval}`,
            },
            id: {
              type: 'text',
              value: queryName,
            },
          },
          enabled: true,
        }));
      });

      onChange({
        isValid: true,
        updatedPolicy,
      });
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleFileChosen = (file) => {
      fileReader = new FileReader();
      fileReader.onloadend = handleFileRead;
      fileReader.readAsText(file);
    };

    const handleInputChange = useCallback(
      (files) => {
        handleFileChosen(files[0]);
        setFiles(files);
      },
      [handleFileChosen]
    );

    return (
      <>
        {isEmpty(files) ? (
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiSpacer size="xl" />
              <EuiFilePicker
                id="osquery_pack_picker"
                initialPromptText="Select or drag and drop osquery pack config file"
                onChange={handleInputChange}
                display="large"
                aria-label="Use aria labels when no actual label is in use"
                fullWidth
              />
              <EuiSpacer size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiFlexGroup>
            <EuiFlexItem>
              {newPolicy.inputs[0].streams.length && (
                // @ts-expect-error update types
                <ScheduledQueryQueriesTable data={newPolicy} handleChange={onChange} />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </>
    );
  }
);
OsqueryManagedPolicyCreateImportExtension.displayName = 'OsqueryManagedPolicyCreateImportExtension';
