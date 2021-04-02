/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, map } from 'lodash';
import { produce } from 'immer';
import {
  EuiFlexGroup,
  EuiLink,
  EuiFormRow,
  EuiFlexItem,
  EuiFilePicker,
  EuiSpacer,
} from '@elastic/eui';
import React, { useCallback, useState } from 'react';

const ExamplePackLink = React.memo(() => (
  <EuiLink href="https://github.com/osquery/osquery/tree/master/packs" target="_blank">
    {'Check example packs'}
  </EuiLink>
));

ExamplePackLink.displayName = 'ExamplePackLink';

/**
 * Exports Osquery-specific package policy instructions
 * for use in the Fleet app create / edit package policy
 */
export const OsqueryPackUploader = React.memo(({ onChange }) => {
  const [files, setFiles] = useState({});

  // @ts-expect-error update types
  let fileReader;

  // @ts-expect-error update types
  const handleFileRead = (e) => {
    // @ts-expect-error update types
    const content = fileReader.result;

    // @ts-expect-error update types
    let queriesJSON;

    try {
      queriesJSON = JSON.parse(content);
      // eslint-disable-next-line no-empty
    } catch (error) {}

    if (!queriesJSON?.queries) {
      return;
    }

    onChange(queriesJSON?.queries);
  };

  // @ts-expect-error update types
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleFileChosen = (file) => {
    fileReader = new FileReader();
    fileReader.onloadend = handleFileRead;
    fileReader.readAsText(file);
  };

  const handleInputChange = useCallback(
    (inputFiles) => {
      handleFileChosen(inputFiles[0]);
      setFiles(inputFiles);
    },
    [handleFileChosen]
  );

  return (
    <>
      <EuiSpacer size="xl" />
      <EuiFormRow fullWidth labelAppend={<ExamplePackLink />}>
        <EuiFilePicker
          id="osquery_pack_picker"
          initialPromptText="Select or drag and drop osquery pack config file"
          onChange={handleInputChange}
          display="large"
          aria-label="Use aria labels when no actual label is in use"
          fullWidth
        />
      </EuiFormRow>
    </>
  );
});
OsqueryPackUploader.displayName = 'OsqueryPackUploader';
