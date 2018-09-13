/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiTitle,
  EuiSpacer,
  EuiCodeEditor,
} from '@elastic/eui';

export const TabJsonUi = ({
  json,
}) => {
  const jsonString = JSON.stringify(json, null, 2);

  return (
    <Fragment>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.rollupJobs.jobDetails.tabJson.sectionJson.title"
            defaultMessage="JSON"
          />
        </h3>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiCodeEditor
        mode="json"
        theme="textmate"
        isReadOnly
        setOptions={{ maxLines: Infinity }}
        value={jsonString}
        editorProps={{
          $blockScrolling: Infinity
        }}
      />
    </Fragment>
  );
};

export const TabJson = injectI18n(TabJsonUi);
